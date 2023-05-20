import type { FloatingWindow } from 'coc-helper'
import { displayHeight, MultiFloatingWindow, versionName } from 'coc-helper'
import type { CompletionItemProvider, MapMode } from 'coc.nvim'
import { commands, Disposable, events, languages, workspace } from 'coc.nvim'
import { logger } from '../util'
import { BaseComponent } from './Base'

export namespace Input {
  export interface Options<Value> {
    title?: string
    /**
     * @default true
     */
    border?: boolean
    /**
     * @default 'center'
     */
    relative?: 'center' | 'cursor-around'
    filetype?: string
    /**
     * @default 30
     */
    width?: number
    prompt?: string
    defaultValue?: Value
    completion?: {
      short: string
      provider: CompletionItemProvider
    }
  }
}

type Instance = MultiFloatingWindow<'prompt' | 'input'>

export abstract class Input<Value> extends BaseComponent<
  Instance,
  Input.Options<Value>,
  Value
> {
  protected static maxId = 0
  protected static actionCmd = `floatinput.input.action_${versionName}`
  protected static inputMap: Map<
    number,
    {
      input: Input<any>
      instance: Instance
      inputWin: FloatingWindow
    }
  > = new Map()
  protected static _inited = false

  protected abstract defaultString(): Promise<string>

  protected abstract valueToString(value: Value): Promise<string>

  protected abstract stringToValue(str: string): Promise<Value>

  protected abstract validateContent(str: string): Promise<boolean>

  protected completionDisposable?: Disposable
  protected id = 0
  protected genFiletype(): string {
    return `coc_floatinput_input_${this.id}`
  }

  protected async changeMode(
    mode: MapMode,
    targetMode: MapMode,
  ): Promise<void> {
    if (mode === targetMode) {
      return
    }
    if (targetMode === 'i') {
      if (mode === 'n') {
        await workspace.nvim.command('call feedkeys("a", "n")')
      }
    } else if (mode !== 'n') {
      await workspace.nvim.command('call feedkeys("\\<ESC>l", "n")')
    }
  }

  protected async getContent(): Promise<string> {
    const instance = await this.instance()
    const buf = instance.floatWinDict.input.buffer
    const lines = await buf.getLines({
      start: 0,
      end: 1,
      strictIndexing: false,
    })
    return lines[0]
  }

  protected async confirm(type: 'cancel' | 'ok'): Promise<void> {
    if (type === 'cancel') {
      await this.close()
    } else if (type === 'ok') {
      const content = await this.getContent()
      if (await this.validateContent(content)) {
        await this.close(await this.stringToValue(content))
      }
    }
  }

  protected _init(): void {
    if (Input._inited) {
      return
    }
    Input._inited = true

    this.disposables.push(
      events.on('BufEnter', async (bufnr) => {
        const it = Input.inputMap.get(bufnr)
        if (it) {
          return
        }
        const openedInputs: Input<any>[] = []
        for (const it of Input.inputMap.values()) {
          if (await it.input.opened()) {
            openedInputs.push(it.input)
          }
        }
        await Promise.all(openedInputs.map((input) => input.confirm('cancel')))
      }),
      events.on('BufWinLeave', async (bufnr) => {
        const it = Input.inputMap.get(bufnr)
        if (!it) {
          return
        }
        await it.inputWin.buffer.setOption('buftype', 'nofile')
        if (await it.input.opened()) {
          await it.input.confirm('cancel')
        }
      }),
      events.on('TextChangedI', async (bufnr) => {
        const it = Input.inputMap.get(bufnr)
        if (!it) {
          return
        }
        await it.input.textChange('i')
      }),
      events.on('TextChanged', async (bufnr) => {
        const it = Input.inputMap.get(bufnr)
        if (!it) {
          return
        }
        await it.input.textChange('n')
      }),
      commands.registerCommand(
        Input.actionCmd,
        logger.asyncCatch(
          async (
            type: 'cancel' | 'ok',
            bufnr: number,
            mode: MapMode,
            targetMode: MapMode,
          ) => {
            const it = Input.inputMap.get(bufnr)
            if (!it) {
              return
            }
            await it.input.changeMode(mode, targetMode)
            await it.input.confirm(type)
          },
        ),
        undefined,
        true,
      ),
    )
  }

  protected async _create(): Promise<Instance> {
    this._init()
    Input.maxId++
    this.id = Input.maxId
    const instance = await MultiFloatingWindow.create({
      wins: {
        prompt: { mode: 'show' },
        input: { mode: 'base' },
      },
    })
    const inputWin = instance.floatWinDict.input
    if (!Input.inputMap.has(inputWin.bufnr)) {
      Input.inputMap.set(inputWin.bufnr, {
        input: this,
        instance,
        inputWin,
      })
    }
    this.disposables.push(
      Disposable.create(() => {
        this.completionDisposable?.dispose()
      }),
    )
    return instance
  }

  protected async _opened(instance: Instance): Promise<boolean> {
    return instance.opened()
  }

  async textChange(mode: MapMode): Promise<void> {
    if (!this.storeOptions) {
      return
    }
    const instance = await this.instance()
    await instance.resize(
      await this.getFinalOpenOptions(
        this.storeOptions,
        instance,
        'resize',
        mode,
      ),
    )
  }

  protected async getFinalOpenOptions(
    options: Input.Options<Value>,
    instance: Instance,
    type: 'open' | 'resize',
    mode: MapMode = 'n',
  ): Promise<MultiFloatingWindow.OpenOptions> {
    const targetMode = (await workspace.nvim.mode).mode as MapMode

    const width = options.width ?? 30
    let inputTop = 0
    const finalOptions: MultiFloatingWindow.OpenOptions = {
      relative: options.relative ?? 'center',
      title: options.title,
      border: options.border === false ? undefined : [],
      wins: {},
    }
    if (options.prompt) {
      const promptLines = options.prompt.split(/\r\n|[\n\r]/g)
      const promptHeight = await displayHeight(width, promptLines)
      finalOptions.wins.prompt = {
        width,
        height: promptHeight,
        focusable: false,
        lines: promptLines,
        highlights: promptLines.map((prompt, line) => ({
          line,
          colStart: 0,
          colEnd: prompt.length,
          hlGroup: 'Question',
        })),
      }
      inputTop = promptHeight
    }

    let inputLines: string[]
    let inputHeight: number
    if (type === 'open') {
      inputLines = [
        options.defaultValue
          ? await this.valueToString(options.defaultValue)
          : await this.defaultString(),
      ]
      inputHeight = await displayHeight(width, inputLines)
    } else {
      const inputWin = instance.floatWinDict.input
      inputLines = await inputWin.buffer.getLines()
      const win = await inputWin.win()
      if (win) {
        const cursor = await win.cursor
        inputHeight = await displayHeight(width, inputLines, cursor, mode)
      } else {
        inputHeight = await displayHeight(width, inputLines)
      }
    }

    const inputBufnr = instance.floatWinDict.input.bufnr
    const filetype = options.filetype ?? this.genFiletype()

    finalOptions.wins.input = {
      top: inputTop,
      width,
      height: inputHeight || 1,
      focus: true,
      modifiable: true,
      lines: inputLines,
      filetype,
      initedExecute: () => `
        call setbufvar(${inputBufnr}, '&buftype', '')
        call setbufvar(${inputBufnr}, '&wrap', 1)
        nmap <silent><buffer> <CR> :call CocAction('runCommand', '${Input.actionCmd}', 'ok', ${inputBufnr}, 'n', '${targetMode}')<CR>
        imap <silent><buffer> <CR> <C-o>:call CocAction('runCommand', '${Input.actionCmd}', 'ok', ${inputBufnr}, 'i', '${targetMode}')<CR>
        nmap <silent><buffer> <ESC> :call CocAction('runCommand', '${Input.actionCmd}', 'cancel', ${inputBufnr}, 'n', '${targetMode}')<CR>
        imap <silent><buffer> <C-c> <C-o>:call CocAction('runCommand', '${Input.actionCmd}', 'cancel', ${inputBufnr}, 'i', '${targetMode}')<CR>
        call feedkeys('A')
      `,
    }

    if (options.completion) {
      if (this.completionDisposable) {
        this.completionDisposable.dispose()
      }
      this.completionDisposable = languages.registerCompletionItemProvider(
        filetype,
        options.completion.short,
        [filetype],
        options.completion.provider,
      )
    }

    return finalOptions
  }

  protected async _open(
    instance: Instance,
    options: Input.Options<Value>,
  ): Promise<void> {
    await instance.open(
      await this.getFinalOpenOptions(options, instance, 'open'),
    )
  }

  protected async _resize(
    instance: Instance,
    options: Input.Options<Value>,
  ): Promise<void> {
    await instance.resize(
      await this.getFinalOpenOptions(options, instance, 'resize'),
    )
  }

  protected async _close(instance: Instance): Promise<void> {
    await instance.close()
  }
}
