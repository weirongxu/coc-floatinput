import { VimModule } from 'coc-helper';

export const keyNames = [
  '<Plug>',
  '<Esc>',
  '<Tab>',
  '<S-Tab>',
  '<Bs>',
  '<Right>',
  '<Left>',
  '<Up>',
  '<Down>',
  '<Home>',
  '<End>',
  '<Cr>',
  '<PageUp>',
  '<PageDown>',
  '<FocusGained>',
  '<ScrollWheelUp>',
  '<ScrollWheelDown>',
  '<LeftMouse>',
  '<LeftDrag>',
  '<LeftRelease>',
  '<2-LeftMouse>',
  '<C-a>',
  '<C-b>',
  '<C-c>',
  '<C-d>',
  '<C-e>',
  '<C-f>',
  '<C-g>',
  '<C-h>',
  '<C-i>',
  '<C-j>',
  '<C-k>',
  '<C-l>',
  '<C-m>',
  '<C-n>',
  '<C-o>',
  '<C-p>',
  '<C-q>',
  '<C-r>',
  '<C-s>',
  '<C-t>',
  '<C-u>',
  '<C-v>',
  '<C-w>',
  '<C-x>',
  '<C-y>',
  '<C-z>',
  '<A-a>',
  '<A-b>',
  '<A-c>',
  '<A-d>',
  '<A-e>',
  '<A-f>',
  '<A-g>',
  '<A-h>',
  '<A-i>',
  '<A-j>',
  '<A-k>',
  '<A-l>',
  '<A-m>',
  '<A-n>',
  '<A-o>',
  '<A-p>',
  '<A-q>',
  '<A-r>',
  '<A-s>',
  '<A-t>',
  '<A-u>',
  '<A-v>',
  '<A-w>',
  '<A-x>',
  '<A-y>',
  '<A-z>',
] as const;

export type KeyNames = typeof keyNames[number];

export async function nameToCode() {
  return await escapedKeysModule.nameToCode.get();
}

export async function codeToName() {
  const nameToCode = await escapedKeysModule.nameToCode.get();
  const codeToName: Record<string, KeyNames> = {};
  Object.entries(nameToCode).forEach(([name, code]) => {
    codeToName[code] = name as KeyNames;
  });
  return codeToName;
}

export const escapedKeysModule = VimModule.create('escaped_keys', (m) => {
  const nameToCodeExpr = `{${keyNames
    .map((k) => `"${k}": "\\${k}"`)
    .join(',')}}`;
  const nameToCode = m.var<Record<KeyNames, string>>(
    'codes_to_name',
    nameToCodeExpr,
  );
  return {
    nameToCode,
  };
});
