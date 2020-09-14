import { activateHelper } from 'coc-helper';
import { commands, ExtensionContext, workspace } from 'coc.nvim';
import { Confirm } from './Components/Confirm';
import { Input } from './Components/Input';
import { IntInput } from './Components/IntInput';
import { NumberInput } from './Components/NumberInput';
import { StringInput } from './Components/StringInput';
import { FloatingUI } from './FloatingUI';
import {
  CocCommandProvider,
  ListProvider,
  VimCommandProvider,
} from './ListProvider';
import { registerRename } from './rename';
import { onError } from './util';

export const FloatInput = {
  components: {
    Input,
    StringInput,
    NumberInput,
    IntInput,
    Confirm,
  },
  ListProvider,
  FloatingUI,
};

export type FloatInputType = typeof FloatInput | undefined;

export async function activate(
  context: ExtensionContext,
): Promise<FloatInputType> {
  if (workspace.isVim) {
    // eslint-disable-next-line no-restricted-properties
    workspace.showMessage('coc-floatinput only support neovim', 'warning');
    return;
  }

  const { subscriptions } = context;

  await activateHelper(context, {
    events: true,
  });

  const input = new StringInput();

  /**
   * Vim command
   */
  async function vimCommand() {
    const content = await input.input({
      title: 'command',
      relative: 'center',
      filetype: 'floatinput-command',
      completion: {
        short: 'C',
        provider: new VimCommandProvider(),
      },
    });

    if (!content) {
      return;
    }

    return workspace.nvim.command(content);
  }
  subscriptions.push(
    input,
    commands.registerCommand('floatinput.command', () => {
      vimCommand().catch(onError);
    }),
    workspace.registerKeymap(['n', 'i'], 'floatinput-command', () => {
      vimCommand().catch(onError);
    }),
  );

  /**
   * Coc command
   */
  async function cocCommand() {
    const content = await input.input({
      title: 'coc-command',
      relative: 'center',
      filetype: 'floatinput-coc-command',
      completion: {
        short: 'C',
        provider: new CocCommandProvider(),
      },
    });

    if (!content) {
      return;
    }

    return commands.executeCommand(content);
  }
  subscriptions.push(
    input,
    commands.registerCommand('floatinput.coc.command', () => {
      cocCommand().catch(onError);
    }),
    workspace.registerKeymap(['n', 'i'], 'floatinput-coc-command', () => {
      cocCommand().catch(onError);
    }),
  );

  await registerRename(context);

  return FloatInput;
}
