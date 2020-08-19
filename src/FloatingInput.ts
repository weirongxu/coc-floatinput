import { FloatingWindow, utilModule } from 'coc-helper';
import {
  commands,
  languages,
  Disposable,
  CompletionItemProvider,
  events,
  workspace,
} from 'coc.nvim';
import { asyncCatch } from './util';

type OnConfirm = (
  content: string,
  context: { bufnr: number },
) => void | Promise<void>;

type FloatingInputOptions = {
  title: string;
  command: string;
  plugmap?: string;
  filetype: string;
  relative: FloatingWindow.OpenOptions['relative'];
  getOpenOptions?: () => Promise<
    | {
        top?: number;
        left?: number;
        title?: string;
        width?: number;
        height?: number;
        text?: string;
        relative?: FloatingInputOptions['relative'];
      }
    | false
  >;
  completion?: {
    short: string;
    provider: CompletionItemProvider;
  };
  onConfirm?: OnConfirm;
};

export class FloatingInput {
  protected static maxId = 0;
  protected static instancesMap: Map<number, FloatingInput> = new Map();
  protected static confirmCmd = 'floatinput.confirm';
  protected static quitCmd = 'floatinput.quit';
  protected static inited = false;

  disposables: Disposable[] = [];
  id: number;

  static floatWinByBufnr(bufnr: number) {
    return this.instancesMap.get(bufnr)?.floatWin;
  }

  static async create(
    options: FloatingInputOptions,
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
        events.on('BufWinLeave', async (bufnr) => {
          const it = this.instancesMap.get(bufnr);
          if (it) {
            await it.floatWin.buffer.setOption('buftype', 'nofile');
          }
        }),
        commands.registerCommand(
          this.confirmCmd,
          async (bufnr: number, mode: string, targetMode: string) => {
            const it = this.instancesMap.get(bufnr);
            if (!it || !it.options.onConfirm) {
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
            await it.options.onConfirm(content, { bufnr });
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
            await utilModule.closeWinByBufnr.call([bufnr]);
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

  protected constructor(
    public floatWin: FloatingWindow,
    public options: FloatingInputOptions,
    disposables: Disposable[],
  ) {
    FloatingInput.maxId += 1;
    this.id = FloatingInput.maxId;

    const callback = asyncCatch(async () => {
      if (!this.floatWin) {
        this.floatWin = await FloatingWindow.create({
          mode: 'base',
        });
      }
      const targetMode = await workspace.nvim.call('mode');
      const openOptions = await options.getOpenOptions?.();
      if (openOptions === false) {
        return;
      }
      await this.floatWin.open({
        relative: openOptions?.relative ?? options.relative,
        top: openOptions?.top ?? 0,
        left: openOptions?.left ?? 0,
        title: openOptions?.title ?? options.title,
        width: openOptions?.width ?? 30,
        height: openOptions?.height ?? 1,
        border: [],
        modifiable: true,
        focus: true,
        filetype: options.filetype,
        inited_execute: (ctx) => `
              call setbufvar(${ctx.bufnr}, '&buftype', '')
              execute 'nmap <silent><buffer> <CR> :call CocAction("runCommand", "${
                FloatingInput.confirmCmd
              }", ' . ${ctx.bufnr} . ', "n", "${targetMode}")<CR>'
              execute 'imap <silent><buffer> <CR> <C-o>:call CocAction("runCommand", "${
                FloatingInput.confirmCmd
              }", ' . ${ctx.bufnr} . ', "i", "${targetMode}")<CR>'
              execute 'nmap <silent><buffer> <ESC> :call CocAction("runCommand", "${
                FloatingInput.quitCmd
              }", ' . ${ctx.bufnr} . ', "n", "${targetMode}")<CR>'
              ${
                openOptions?.text
                  ? `call setline(1, '${openOptions.text.replace(/'/g, "''")}')`
                  : ''
              }
              call feedkeys('A')
            `,
      });
    });

    disposables.push(commands.registerCommand(options.command, callback));
    if (options.plugmap) {
      disposables.push(
        workspace.registerKeymap(['n', 'v', 'i'], options.plugmap, callback),
      );
    }

    if (options.completion) {
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
