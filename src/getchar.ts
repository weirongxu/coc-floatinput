import { HelperEventEmitter } from 'coc-helper';
import { workspace } from 'coc.nvim';
import type { LiteralUnion } from 'type-fest';
import type { KeyNames } from './escapeKeys';
import { nameToCode } from './escapeKeys';
import { logger } from './util';

export enum CharMode {
  none = 0,
  shift = 2,
  control = 4,
  /**
   * alt / meta
   */
  alt = 8,
  meta = 16,
  mouseDoubleClick = 32,
  mouseTripleClick = 64,
  mouseQuadrupleClick = 96,
  /**
   * MacOS only
   */
  command = 128,
}

export async function getcharStart<R = void>(
  onInputChar: (options: {
    char: string;
    mode: CharMode;
    codes: Record<KeyNames, string>;
    matchCodeWith: (
      code: string,
      names: LiteralUnion<KeyNames, string>[],
    ) => boolean;
    matchCode: (names: LiteralUnion<KeyNames, string>[]) => boolean;
    stop: (result?: R) => Promise<void>;
  }) => unknown,
): Promise<R | undefined> {
  const codes = await nameToCode();
  getcharModule.startPrompt().catch(logger.error);
  const onInputChar_: typeof onInputChar = logger.asyncCatch(onInputChar);
  const matchCodeWith = (
    char: string,
    names: LiteralUnion<KeyNames, string>[],
  ) =>
    names.some((name) =>
      name in codes ? codes[name] === char : char === name,
    );
  return await new Promise<R | undefined>((resolve) => {
    const stop = async (result?: R) => {
      await getcharModule.stopPrompt();
      disposable.dispose();
      resolve(result);
    };
    const disposable = getcharEvents.on('InputChar', (char, mode) => {
      onInputChar_({
        char,
        mode,
        codes,
        matchCodeWith,
        matchCode: matchCodeWith.bind(undefined, char),
        stop,
      });
    });
  });
}

export const getcharEvents = new HelperEventEmitter<{
  InputChar: (ch: string, mode: CharMode) => void;
}>(logger);

export const getcharModule = {
  async startPrompt(): Promise<void> {
    await workspace.nvim.call('coc_floatinput#getchar#start_prompt');
  },
  async stopPrompt(): Promise<void> {
    await workspace.nvim.call('coc_floatinput#getchar#stop_prompt');
  },
};
