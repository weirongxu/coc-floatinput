import { byteLength, sum } from 'coc-helper';

export interface BaseColumn {
  text: string;
  width: number;
}

export type ColumnLayout<C extends BaseColumn> = C & {
  line: number;
  colStart: number;
  colEnd: number;
};

function divideSpacesBy(fullSpaceWidth: number, columns: BaseColumn[]) {
  const spaceUnit = Math.ceil(fullSpaceWidth / columns.length);
  const spaces: number[] = new Array(columns.length);
  for (let i = 0; i < columns.length; i++) {
    if (spaces[i] === undefined) {
      if (spaceUnit <= fullSpaceWidth) {
        fullSpaceWidth -= spaceUnit;
        spaces[i] = spaceUnit;
      } else {
        spaces[i] = fullSpaceWidth;
      }
    }
  }
  return spaces;
}

function columnFlexLayout<C extends BaseColumn>(
  maxWidth: number,
  columns: C[],
): ColumnLayout<C>[] {
  const totalColumnsWidth = sum(columns.map((c) => c.width));
  const spaceWidth = maxWidth - totalColumnsWidth;
  const spaces = divideSpacesBy(spaceWidth, columns);
  let col = 0;
  return columns.map((c, i) => {
    const space = spaces[i] ?? 0;
    let text: string;
    if (space) {
      const left = Math.ceil(space / 2);
      const right = space - left;
      text = `${' '.padStart(left)} ${c.text} ${' '.padStart(right)}`;
    } else {
      text = ` ${c.text} `;
    }
    if (i !== 0) {
      text = `|${text}`;
      col += 1;
    }
    const colStart = col;
    col += byteLength(text);
    return {
      ...c,
      line: 0,
      colStart,
      colEnd: col,
      width: c.width + space,
      text,
    };
  });
}

export function columnsFlexLayout<C extends BaseColumn>(
  maxWidth: number,
  columns: C[],
): ColumnLayout<C>[][] {
  const lines: C[][] = [];
  let curWidth = 0;
  let curColumns: C[] = [];
  for (const column of columns) {
    if (curColumns.length) {
      // delimiter
      column.width += 1;
    }
    // add 2 spaces
    column.width += 2;
    curWidth += column.width;
    if (curColumns.length && curWidth >= maxWidth) {
      lines.push(curColumns);
      curColumns = [];
      curWidth = column.width;
    }
    curColumns.push(column);
  }
  lines.push(curColumns);

  return lines.map((columns, line) =>
    columnFlexLayout(maxWidth, columns).map((c) => ({
      ...c,
      line,
    })),
  );
}
