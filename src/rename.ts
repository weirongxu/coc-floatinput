import {
  workspace,
  Document,
  languages,
  ExtensionContext,
  commands,
  window,
  Position,
} from 'coc.nvim';
import { logger, synchronizeDocument } from './util';
import { CocSymbolProvider } from './ListProvider';
import { StringInput } from './Components/StringInput';

async function hasProviderRename() {
  if (!(await workspace.nvim.call('CocHasProvider', 'rename'))) {
    // eslint-disable-next-line no-restricted-properties
    window.showMessage(
      'Rename provider not found for current document',
      'error',
    );
    return false;
  }
  return true;
}

async function getPrepareRename(doc: Document, position: Position) {
  // @ts-ignore
  const prepare = await languages.prepareRename(doc.textDocument, position);
  if (!prepare) {
    // eslint-disable-next-line no-restricted-properties
    window.showMessage('Invalid position for renmame', 'error');
    return false;
  }
  return prepare;
}

async function getCurrentWord(doc: Document, position: Position) {
  const prepare = await getPrepareRename(doc, position);
  if (!prepare) {
    return;
  }
  const word =
    'placeholder' in prepare
      ? prepare.placeholder
      : doc.textDocument.getText(prepare);
  return word;
}

export async function registerRename(context: ExtensionContext) {
  const provider = new CocSymbolProvider();

  const input = new StringInput();

  async function rename() {
    const doc = await workspace.document;
    await synchronizeDocument(doc);
    if (!(await hasProviderRename())) {
      return;
    }

    const position = await window.getCursorPosition();
    const word = await getCurrentWord(doc, position);
    if (!word) {
      return;
    }

    provider.document = doc;

    const result = await input.input({
      title: 'coc-rename',
      filetype: 'floatinput-coc-rename',
      relative: 'cursor-around',
      defaultValue: word,
      prompt: word + ' ->',
      completion: {
        short: 'C',
        provider,
      },
    });

    if (result !== undefined) {
      if (!result) {
        // eslint-disable-next-line no-restricted-properties
        window.showMessage('Empty name, canceled', 'warning');
        return;
      }

      // @ts-ignore
      const edit = await languages.provideRenameEdits(
        doc.textDocument,
        position,
        result,
      );
      if (!edit) {
        // eslint-disable-next-line no-restricted-properties
        window.showMessage('Invalid position for rename', 'warning');
        return;
      }
      await workspace.applyEdit(edit);
    }
  }

  context.subscriptions.push(
    input,
    commands.registerCommand('floatinput.rename', () => {
      rename().catch(logger.error);
    }),
    workspace.registerKeymap(['n', 'i'], 'floatinput-rename', () => {
      rename().catch(logger.error);
    }),
  );
}
