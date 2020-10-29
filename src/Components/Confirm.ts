import {
  displayHeight,
  displayWidth,
  MultiFloatingWindow,
  versionName,
} from 'coc-helper';
import { workspace } from 'coc.nvim';
import { ColumnLayout, columnsFlexLayout } from '../column-flex-layout';
import { CharMode, getcharStart } from '../getchar';
import { onError } from '../util';
import { BaseComponent } from './Base';

export namespace Confirm {
  export type Column<Value extends string> = {
    text: string;
    value: Value;
    width: number;
  };

  export interface Options<Value extends string = 'yes' | 'no'> {
    title?: string;
    /**
     * @default true
     */
    border?: boolean;
    /**
     * @default 'center'
     */
    relative?: 'center' | 'cursor-around';
    /**
     * @default 30
     */
    width?: number;
    prompt?: string;
    /**
     * @default ['yes', 'no']
     */
    values?: Value[];
    /**
     * @default 'no'
     */
    defaultValue?: Value;
    /**
     * button texts
     */
    buttonText?: (string | undefined)[];
  }
}

type WinKeys = 'prompt' | 'btn';
type Instance = MultiFloatingWindow<WinKeys>;

export class Confirm<Value extends string = 'yes' | 'no'> extends BaseComponent<
  Instance,
  Confirm.Options<Value>,
  Value
> {
  protected static actionCmd = 'floatinput.input.action_' + versionName;
  protected static _inited = false;

  protected readonly defaultValues = ['yes', 'no'] as Value[];
  protected value!: Value;
  protected btnLinesLayout?: ColumnLayout<Confirm.Column<Value>>[][];

  protected async _create(): Promise<Instance> {
    return await MultiFloatingWindow.create({
      wins: {
        prompt: { mode: 'show' },
        btn: { mode: 'show', hasBorderBuf: true },
      },
    });
  }

  protected async _opened(instance: Instance): Promise<boolean> {
    return instance.opened();
  }

  protected async getFinalOpenOptions(
    options: Confirm.Options<Value>,
  ): Promise<MultiFloatingWindow.OpenOptions> {
    const width = options.width ?? 30;
    let btnTop = 0;
    const finalOptions: MultiFloatingWindow.OpenOptions<WinKeys> = {
      relative: options.relative ?? 'center',
      title: options.title,
      border: [],
      wins: {},
    };
    if (options.prompt) {
      const promptLines = options.prompt.split(/\r\n|[\n\r]/g);
      const promptHeight = await displayHeight(width, promptLines);
      finalOptions.wins.prompt = {
        width,
        height: promptHeight,
        focusable: false,
        lines: promptLines,
        highlights: promptLines.map((_, line) => ({
          line,
          colStart: 0,
          colEnd: -1,
          hlGroup: 'Question',
        })),
      };
      btnTop = promptHeight;
    }

    const valueInfos: Confirm.Column<Value>[] = await Promise.all(
      (options.values ?? this.defaultValues).map(async (value, idx) => {
        const text =
          options.buttonText?.[idx] ??
          `${value[0].toUpperCase()}${value.slice(1)} (${value[0]})`;
        return {
          text,
          value: value as Value,
          width: await displayWidth(text),
        };
      }),
    );

    this.btnLinesLayout = columnsFlexLayout(width, valueInfos);
    const btnHeight = this.btnLinesLayout.length;
    finalOptions.wins.btn = {
      top: btnTop,
      width,
      height: btnHeight,
      lines: this.btnLinesLayout.map((cl) => cl.map((c) => c.text).join('')),
      border: [1, 0, 0, 0],
    };

    return finalOptions;
  }

  protected async waitUserInput(instance: Instance, values: Value[]) {
    try {
      const value = await getcharStart<Value>(
        async ({ char: ch, mode, stop, matchCode }) => {
          const btn = await instance.floatWinDict.btn.win();
          if (!btn) {
            await stop();
            return;
          }
          if (mode !== CharMode.none) {
            return;
          }

          if (matchCode(['<Esc>', '<C-c>'])) {
            await stop();
          } else if (matchCode(['k', '<Up>', 'h', '<Left>'])) {
            const idx = values.indexOf(this.value);
            this.value = values[(idx + values.length - 1) % values.length];
            await this.resize();
          } else if (matchCode(['j', '<Down>', 'l', '<Right>'])) {
            const idx = values.indexOf(this.value);
            this.value = values[(idx + 1) % values.length];
            await this.resize();
          } else if (matchCode(['<LeftMouse>'])) {
            const [
              mouseWinid,
              mouseLnum,
              mouseCol,
            ] = (await workspace.nvim.eval(
              '[v:mouse_winid, v:mouse_lnum, v:mouse_col]',
            )) as [number, number, number];
            if (mouseWinid === btn.id && this.btnLinesLayout) {
              const column = this.btnLinesLayout[mouseLnum - 1].find(
                (c) => c.colStart <= mouseCol && mouseCol < c.colEnd,
              );
              if (column) {
                await stop(column.value);
              }
            }
          } else if (matchCode(['<Cr>'])) {
            await stop(this.value);
          } else {
            const firstLetter = ch.toLowerCase();
            const value = values.find(
              (v) => v[0].toLowerCase() === firstLetter,
            );
            if (value) {
              await stop(value);
            }
          }
        },
      );
      await this.close(value);
    } catch (error) {
      await this.close();
    }
  }

  protected async updateHighlights(instance: Instance) {
    workspace.nvim.pauseNotification();
    instance.floatWinDict.btn.buffer.clearHighlight();
    this.btnLinesLayout?.forEach((line) => {
      line.forEach((column) => {
        void instance.floatWinDict.btn.buffer.addHighlight({
          ...column,
          srcId: 0,
          hlGroup: this.value === column.value ? 'PmenuSel' : 'None',
        });
      });
    });
    workspace.nvim.command('redraw!', true);
    await workspace.nvim.resumeNotification();
  }

  protected async _open(instance: Instance, options: Confirm.Options<Value>) {
    const values = options.values ?? this.defaultValues;
    this.value = options.defaultValue ?? values[values.length - 1];
    await instance.open(await this.getFinalOpenOptions(options));
    await this.updateHighlights(instance);
    this.waitUserInput(instance, values).catch(onError);
  }

  protected async _resize(instance: Instance, options: Confirm.Options<Value>) {
    await instance.resize(await this.getFinalOpenOptions(options));
    await this.updateHighlights(instance);
  }

  protected async _close(instance: Instance) {
    await instance.close();
  }
}
