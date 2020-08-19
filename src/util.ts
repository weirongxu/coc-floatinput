import { genAsyncCatch, genOnError } from 'coc-helper';
import { workspace, Document } from 'coc.nvim';

const outputChannel = workspace.createOutputChannel('coc-floatinput');

export const onError = genOnError(outputChannel);

export const asyncCatch = genAsyncCatch(onError);

export async function synchronizeDocument(doc: Document): Promise<void> {
  const { changedtick } = doc;
  await doc.patchChange();
  if (changedtick !== doc.changedtick) {
    await sleep(50);
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
