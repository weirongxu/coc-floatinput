import {
  workspace,
  Document,
  languages,
  ExtensionContext,
  commands,
} from 'coc.nvim';
import { Position } from 'vscode-languageserver-protocol';
import { onError, synchronizeDocument } from './util';
import { CocSymbolProvider } from './ListProvider';
import { StringInput } from './Components/StringInput';

function hasProviderRename(doc: Document) {
  if (!languages.hasProvider('rename', doc.textDocument)) {
    // eslint-disable-next-line no-restricted-properties
    workspace.showMessage(
      'Rename provider not found for current document',
      'error',
    );
    return false;
  }
  return true;
}

async function getPrepareRename(doc: Document, position: Position) {
  const prepare = await languages.prepareRename(doc.textDocument, position);
  if (!prepare) {
    // eslint-disable-next-line no-restricted-properties
    workspace.showMessage('Invalid position for renmame', 'error');
    return false;
  }
  return prepare;
}

export async function registerRename(context: ExtensionContext) {
  const provider = new CocSymbolProvider();

  const input = new StringInput();

  async function getCurrentWord(doc: Document) {
    if (!hasProviderRename(doc)) {
      return false;
    }

    const position = await workspace.getCursorPosition();

    await synchronizeDocument(doc);

    const prepare = await getPrepareRename(doc, position);
    if (!prepare) {
      return false;
    }
    const word =
      'placeholder' in prepare
        ? prepare.placeholder
        : doc.textDocument.getText(prepare);
    return word;
  }

  async function rename() {
    // TODO debug
    const doc = await workspace.document;
    const word = await getCurrentWord(doc);

    if (word === false) {
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
        workspace.showMessage('Empty name, canceled', 'warning');
        return;
      }

      const doc = await workspace.document;
      if (!hasProviderRename(doc)) {
        return;
      }

      const position = await workspace.getCursorPosition();

      await synchronizeDocument(doc);

      const prepare = await getPrepareRename(doc, position);
      if (!prepare) {
        return;
      }

      const edit = await languages.provideRenameEdits(
        doc.textDocument,
        position,
        result,
      );
      if (!edit) {
        // eslint-disable-next-line no-restricted-properties
        workspace.showMessage('Invalid position for rename', 'warning');
        return;
      }
      await workspace.applyEdit(edit);
    }
  }

  context.subscriptions.push(
    input,
    commands.registerCommand('floatinput.rename', () => {
      rename().catch(onError);
    }),
    workspace.registerKeymap(['n', 'i'], 'floatinput-rename', () => {
      rename().catch(onError);
    }),
  );
}
