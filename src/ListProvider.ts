import {
  CompletionItemProvider,
  workspace,
  commands,
  Document,
  CompletionItem,
  Position,
  Range,
  CompletionItemKind,
  TextDocument,
} from 'coc.nvim';

type ListItem = { name: string; kind?: CompletionItemKind };

interface SymbolInfo {
  filepath?: string;
  lnum: number;
  col: number;
  text: string;
  kind: string;
  level?: number;
  containerName?: string;
  range: Range;
  selectionRange?: Range;
}

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
      const symbols = (await workspace.nvim.call('CocAction', [
        'documentSymbols',
        this.document.bufnr,
      ])) as SymbolInfo[];
      return symbols
        .map((s) => ({ name: s.text }))
        .filter((s) => s.name.startsWith(prefix));
    }
    return [];
  }
}
