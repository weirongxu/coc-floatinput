import { FloatingInput } from './FloatingInput';
import { workspace, Document, languages, ExtensionContext } from 'coc.nvim';
import { Position } from 'vscode-languageserver-protocol';
import { synchronizeDocument } from './util';
import { CocSymbolProvider } from './ListProvider';

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

  await FloatingInput.create(
    {
      title: 'coc-rename',
      relative: 'cursor-around',
      filetype: 'floatinput-coc-rename',
      command: 'floatinput.rename',
      plugmap: 'floatinput-rename',
      getOpenOptions: async () => {
        const doc = await workspace.document;
        if (!hasProviderRename(doc)) {
          return false;
        }

        const position = await workspace.getCursorPosition();

        await synchronizeDocument(doc);

        provider.document = doc;

        const prepare = await getPrepareRename(doc, position);
        if (!prepare) {
          return false;
        }
        const word =
          'placeholder' in prepare
            ? prepare.placeholder
            : doc.textDocument.getText(prepare);
        return {
          text: word,
        };
      },
      completion: {
        short: 'C',
        provider,
      },
      async onConfirm(content) {
        if (!content) {
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
          content,
        );
        if (!edit) {
          // eslint-disable-next-line no-restricted-properties
          workspace.showMessage('Invalid position for rename', 'warning');
          return;
        }
        await workspace.applyEdit(edit);
      },
    },
    context.subscriptions,
  );
}
