import { activateHelper } from 'coc-helper';
import { commands, ExtensionContext, workspace } from 'coc.nvim';
import {
  CocCommandProvider,
  VimCommandProvider,
  ListProvider,
} from './ListProvider';
import { FloatingInput } from './FloatingInput';
import { registerRename } from './rename';

type FloatInputApi =
  | {
      FloatingInput: typeof FloatingInput;
      ListProvider: typeof ListProvider;
    }
  | undefined;

export async function activate(
  context: ExtensionContext,
): Promise<FloatInputApi> {
  if (workspace.isVim) {
    // eslint-disable-next-line no-restricted-properties
    workspace.showMessage('coc-floatinput only support neovim', 'warning');
    return;
  }

  const { subscriptions } = context;

  await activateHelper(context);

  /**
   * Vim command
   */
  await FloatingInput.create(
    {
      title: 'command',
      relative: 'center',
      filetype: 'floatinput-command',
      command: 'floatinput.command',
      plugmap: 'floatinput-command',
      completion: {
        short: 'C',
        provider: new VimCommandProvider(),
      },
      async onConfirmed(content) {
        return workspace.nvim.command(content);
      },
    },
    subscriptions,
  );

  /**
   * Coc command
   */
  await FloatingInput.create(
    {
      title: 'coc-command',
      relative: 'center',
      filetype: 'floatinput-coc-command',
      command: 'floatinput.coc.command',
      plugmap: 'floatinput-coc-command',
      completion: {
        short: 'C',
        provider: new CocCommandProvider(),
      },
      async onConfirmed(content) {
        return commands.executeCommand(content);
      },
    },
    subscriptions,
  );

  await registerRename(context);

  return { FloatingInput, ListProvider };
}

export { FloatingInput, ListProvider, FloatInputApi };
