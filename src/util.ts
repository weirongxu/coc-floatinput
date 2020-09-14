import { genAsyncCatch, genOnError, sleep } from 'coc-helper';
import { Document, workspace } from 'coc.nvim';
import Pkg from '../package.json';

const outputChannel = workspace.createOutputChannel('coc-floatinput');

export const version = Pkg.version;

export const versionName = version.replace(/[.-]/g, '_');

export const onError = genOnError(outputChannel);

export const asyncCatch = genAsyncCatch(onError);

export async function synchronizeDocument(doc: Document): Promise<void> {
  const { changedtick } = doc;
  await doc.patchChange();
  if (changedtick !== doc.changedtick) {
    await sleep(50);
  }
}
