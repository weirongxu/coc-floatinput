import { FloatingWindow, utilModule } from 'coc-helper';
import {
  commands,
  languages,
  Disposable,
  CompletionItemProvider,
  events,
  workspace,
  disposeAll,
} from 'coc.nvim';
import { asyncCatch } from './util';

export namespace FloatingInput {
  export type OnConfirmed = (
    content: string,
    context: { bufnr: number },
  ) => void | Promise<void>;

  export type OnClosed = (context: { bufnr: number }) => void | Promise<void>;

  export type Options = {
    title: string;
    relative: FloatingWindow.OpenOptions['relative'];
    command?: string;
    plugmap?: string;
    filetype?: string;
    defaultOpenOptions?: Partial<FloatingWindow.OpenOptions>;
    optionsOnTrigger?: () => Promise<
      | {
          openOptions?: Partial<FloatingWindow.OpenOptions>;
          text?: string;
        }
      | false
    >;
    completion?: {
      short: string;
      provider: CompletionItemProvider;
    };
    onConfirmed?: OnConfirmed;
    onClosed?: OnClosed;
  };
}

export class FloatingInput {
  protected static maxId = 0;
  protected static instancesMap: Map<number, FloatingInput> = new Map();
  protected static confirmCmd = 'floatinput.confirm';
  protected static quitCmd = 'floatinput.quit';
  protected static inited = false;

  protected openCallback?: () => Promise<void>;

  disposables: Disposable[] = [];
  id: number;
  protected opened = false;
  finalOpenOptions?: FloatingWindow.OpenOptions;

  static async create(
    options: FloatingInput.Options,
    disposables: Disposable[],
  ) {
    if (!this.inited) {
      async function changeMode(mode: string, targetMode: string) {
        if (mode === targetMode) {
          return;
        }
        if (targetMode === 'i') {
          if (mode === 'n') {
            await workspace.nvim.command('call feedkeys("i", "n")');
          }
        } else if (mode !== 'n') {
          await workspace.nvim.command('call feedkeys("\\<ESC>", "n")');
        }
      }
      disposables.push(
        events.on('BufEnter', async (bufnr) => {
          const it = this.instancesMap.get(bufnr);
          if (!it) {
            await Promise.all(
              Array.from(this.instancesMap.values())
                .filter((it) => it.opened)
                .map(async (it) => {
                  await it.close();
                }),
            );
          }
        }),
        events.on('BufWinLeave', async (bufnr) => {
          const it = this.instancesMap.get(bufnr);
          if (it) {
            await it.floatWin.buffer.setOption('buftype', 'nofile');
          }
        }),
        events.on('TextChanged', async (bufnr) => {
          const it = this.instancesMap.get(bufnr);
          if (!it) {
            return;
          }
          await it.adjustAutoResize();
        }),
        events.on('TextChangedI', async (bufnr) => {
          const it = this.instancesMap.get(bufnr);
          if (!it) {
            return;
          }
          await it.adjustAutoResize();
        }),
        commands.registerCommand(
          this.confirmCmd,
          async (bufnr: number, mode: string, targetMode: string) => {
            const it = this.instancesMap.get(bufnr);
            if (!it || !it.options.onConfirmed) {
              return;
            }

            const buf = it.floatWin.buffer;
            const lines = await buf.getLines({
              start: 0,
              end: 1,
              strictIndexing: false,
            });
            const content = lines[0];
            await utilModule.closeWinByBufnr.call([bufnr]);
            await it.options.onConfirmed(content, { bufnr });
            await it.options.onClosed?.({ bufnr });
            await changeMode(mode, targetMode);
          },
          undefined,
          true,
        ),
        commands.registerCommand(
          this.quitCmd,
          async (bufnr: number, mode: string, targetMode: string) => {
            const it = this.instancesMap.get(bufnr);
            if (!it) {
              return;
            }
            await it.close();
            await changeMode(mode, targetMode);
          },
          undefined,
          true,
        ),
      );
    }

    const floatWin = await FloatingWindow.create({
      mode: 'base',
    });

    const floatInput = new FloatingInput(floatWin, options, disposables);

    this.instancesMap.set(floatWin.bufnr, floatInput);
    disposables.push(
      Disposable.create(() => {
        this.instancesMap.delete(floatWin.bufnr);
      }),
    );

    return floatInput;
  }

  static async input(
    title: string,
    defaultText: string,
    options: Partial<FloatingInput.Options>,
  ): Promise<string | undefined> {
    const disposables: Disposable[] = [];
    let result: string | undefined;
    await new Promise(async (resolve) => {
      const floatInput = await this.create(
        {
          title,
          relative: 'cursor-around',
          async optionsOnTrigger() {
            return {
              text: defaultText,
            };
          },
          onConfirmed(confirmText) {
            result = confirmText;
          },
          onClosed() {
            disposeAll(disposables);
            resolve();
          },
          ...options,
        },
        disposables,
      );
      await floatInput.open();
    });
    return result;
  }

  protected constructor(
    public floatWin: FloatingWindow,
    public options: FloatingInput.Options,
    disposables: Disposable[],
  ) {
    FloatingInput.maxId += 1;
    this.id = FloatingInput.maxId;

    this.openCallback = asyncCatch(async () => {
      if (!this.floatWin) {
        this.floatWin = await FloatingWindow.create({
          mode: 'base',
          inited_execute: (ctx) => `
            call setbufvar(${ctx.bufnr}, '&wrap', 1)
          `,
        });
      }
      const targetMode = await workspace.nvim.call('mode');
      const triggerOptions = await options.optionsOnTrigger?.();
      if (triggerOptions === false) {
        return;
      }
      this.finalOpenOptions = {
        relative: options.relative,
        top: 0,
        left: 0,
        title: options.title,
        width: 30,
        height: 1,
        border: [],
        modifiable: true,
        focus: true,
        filetype: options.filetype,
        inited_execute: (ctx) => `
          call setbufvar(${ctx.bufnr}, '&buftype', '')
          call setbufvar(${ctx.bufnr}, '&wrap', 1)
          execute 'nmap <silent><buffer> <CR> :call CocAction("runCommand", "${
            FloatingInput.confirmCmd
          }", ' . ${ctx.bufnr} . ', "n", "${targetMode}")<CR>'
          execute 'imap <silent><buffer> <CR> <C-o>:call CocAction("runCommand", "${
            FloatingInput.confirmCmd
          }", ' . ${ctx.bufnr} . ', "i", "${targetMode}")<CR>'
          execute 'nmap <silent><buffer> <ESC> :call CocAction("runCommand", "${
            FloatingInput.quitCmd
          }", ' . ${ctx.bufnr} . ', "n", "${targetMode}")<CR>'
          execute 'imap <silent><buffer> <C-c> <C-o>:call CocAction("runCommand", "${
            FloatingInput.quitCmd
          }", ' . ${ctx.bufnr} . ', "i", "${targetMode}")<CR>'
          ${
            triggerOptions?.text
              ? `call setline(1, '${triggerOptions.text.replace(/'/g, "''")}')`
              : ''
          }
          call feedkeys('A')
        `,
        ...(options.defaultOpenOptions ?? {}),
        ...(triggerOptions?.openOptions ?? {}),
      };
      await this.floatWin.open(this.finalOpenOptions);
      this.opened = true;
    });

    if (options.command) {
      disposables.push(
        commands.registerCommand(options.command, () => this.openCallback),
      );
    }
    if (options.plugmap) {
      disposables.push(
        workspace.registerKeymap(
          ['n', 'v', 'i'],
          options.plugmap,
          this.openCallback,
        ),
      );
    }

    if (options.completion) {
      if (!options.filetype) {
        // eslint-disable-next-line no-restricted-properties
        workspace.showMessage(
          'completion.provider require a filetype',
          'warning',
        );
      } else {
        disposables.push(
          languages.registerCompletionItemProvider(
            options.filetype,
            options.completion.short,
            [options.filetype],
            options.completion.provider,
          ),
        );
      }
    }
  }

  async open() {
    await this.openCallback?.();
  }

  async adjustAutoResize() {
    if (!this.finalOpenOptions) {
      return;
    }
    const width = this.finalOpenOptions.width;
    const lines = await this.floatWin.buffer.getLines();
    const heights = await Promise.all(
      lines.map(async (l) => {
        const strwidth: number = await workspace.nvim.call('strdisplaywidth', [
          l,
        ]);
        return Math.ceil((strwidth || 1) / width);
      }),
    );
    const height = heights.reduce((c, h) => c + h);
    if (height !== this.finalOpenOptions.height) {
      this.finalOpenOptions.height = height;
      await this.floatWin.resize(this.finalOpenOptions);
    }
  }

  async close() {
    await this.floatWin.close();
    await this.options.onClosed?.({ bufnr: this.floatWin.bufnr });
    this.opened = false;
  }
}
