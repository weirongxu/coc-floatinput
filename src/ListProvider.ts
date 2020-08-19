import {
  CompletionItemProvider,
  workspace,
  commands,
  languages,
  Document,
} from 'coc.nvim';
import {
  Position,
  TextDocument,
  Range,
  CompletionItem,
  CompletionItemKind,
  SymbolInformation,
  DocumentSymbol,
} from 'vscode-languageserver-protocol';

type ListItem = { name: string; kind?: CompletionItemKind };

export abstract class ListProvider implements CompletionItemProvider {
  abstract getList(prefix: string): Promise<ListItem[]>;

  completionKind: CompletionItemKind = CompletionItemKind.Method;

  async provideCompletionItems(
    document: TextDocument,
    position: Position,
  ): Promise<CompletionItem[]> {
    const currentLine = document.getText(
      Range.create(Position.create(position.line, 0), position),
    );
    const list = await this.getList(currentLine);
    return list.map((l) => ({
      label: l.name,
      kind: l.kind ?? this.completionKind,
      insertText: l.name,
    }));
  }
}

export class VimCommandProvider extends ListProvider {
  async getList(prefix: string): Promise<ListItem[]> {
    const cmds = (await workspace.nvim.call('getcompletion', [
      prefix,
      'cmdline',
    ])) as string[];
    return cmds.map((c) => ({
      name: c,
    }));
  }
}

export class CocCommandProvider extends ListProvider {
  async getList(prefix: string): Promise<ListItem[]> {
    return commands.commandList
      .map((c) => ({
        name: c.id,
      }))
      .filter((c) => c.name.startsWith(prefix));
  }
}

export class CocSymbolProvider extends ListProvider {
  document?: Document;

  async getList(prefix: string): Promise<ListItem[]> {
    if (this.document) {
      const symbols = (await languages.getDocumentSymbol(
        this.document.textDocument,
      )) as (SymbolInformation | DocumentSymbol)[];
      return symbols
        .map((s) => ({ name: s.name }))
        .filter((s) => s.name.startsWith(prefix));
    }
    return [];
  }
}
