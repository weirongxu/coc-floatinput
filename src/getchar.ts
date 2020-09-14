import { VimModule } from 'coc-helper';
import { events } from 'coc.nvim';
import { KeyNames, nameToCode } from './escapeKeys';
import { asyncCatch, onError } from './util';
import { LiteralUnion } from 'type-fest';

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
  getcharModule.startPrompt.call().catch(onError);
  const onInputChar_: typeof onInputChar = asyncCatch(onInputChar);
  const matchCodeWith = (
    char: string,
    names: LiteralUnion<KeyNames, string>[],
  ) =>
    names.some((name) =>
      name in codes ? codes[name] === char : char === name,
    );
  return await new Promise<R | undefined>((resolve) => {
    const stop = async (result?: R) => {
      await getcharModule.stopPrompt.call();
      disposable.dispose();
      resolve(result);
    };
    const disposable = events.on('InputChar', (char, mode) => {
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

export const getcharModule = VimModule.create('getchar', (m) => {
  const activated = m.var('activated', '0');

  const getc = m.fn<[], string>(
    'getc',
    ({ name }) => `
      function! ${name}() abort
        try
          let c = getchar()
          return type(c) == type(0) ? nr2char(c) : c
        catch /^Vim:Interrupt$/
          return "\\<C-c>"
        endtry
      endfunction
    `,
  );

  return {
    activated,
    getc,
    startPrompt: m.fn<[], void>(
      'start_prompt',
      ({ name }) => `
        function! ${name}() abort
          if ${activated.inline}
            return
          endif
          let ${activated.inline} = 1
          while ${activated.inline}
            let ch = ${getc.inlineCall()}
            if ch ==# "\\<FocusLost>" || ch ==# "\\<FocusGained>" || ch ==# "\\<CursorHold>"
              continue
            else
              call coc#rpc#notify('InputChar', [ch, getcharmod()])
            endif
          endwhile
        endfunction
      `,
    ),
    stopPrompt: m.fn<[], void>(
      'stop_prompt',
      ({ name }) => `
        function! ${name}() abort
          if ${activated.inline}
            let ${activated.inline} = 0
            call feedkeys("\\<C-c>")
          endif
        endfunction
      `,
    ),
  };
});