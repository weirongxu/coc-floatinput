import { getConfigLocal, HelperLogger, sleep } from 'coc-helper';
import { Document } from 'coc.nvim';

export const logger = new HelperLogger('floatinput');

export async function synchronizeDocument(doc: Document): Promise<void> {
  const { changedtick } = doc;
  // @ts-ignore
  await doc.patchChange();
  if (changedtick !== doc.changedtick) {
    await sleep(50);
  }
}

export const configLocal = getConfigLocal('floatinput');
