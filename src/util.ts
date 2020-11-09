import { getConfigLocal, genAsyncCatch, genOnError, sleep } from 'coc-helper';
import { Document, workspace } from 'coc.nvim';

const outputChannel = workspace.createOutputChannel('floatinput');

export const onError = genOnError(outputChannel);

export const asyncCatch = genAsyncCatch(onError);

export async function synchronizeDocument(doc: Document): Promise<void> {
  const { changedtick } = doc;
  await doc.patchChange();
  if (changedtick !== doc.changedtick) {
    await sleep(50);
  }
}

export const configLocal = getConfigLocal('floatinput');
