import { jestHelper, VimModule } from 'coc-helper';
import { workspace } from 'coc.nvim';
import { escapedKeysModule } from './escapeKeys';

jestHelper.boot();

beforeAll(async () => {
  await VimModule.init();
});

test('escapedKeyCodes', async () => {
  const codes = await escapedKeysModule.nameToCode.get();
  expect(codes['<Cr>']).toBe(await workspace.nvim.eval('"\\<Cr>"'));
  expect(codes['<C-a>']).toBe(await workspace.nvim.eval('"\\<C-a>"'));
});