import { HelperVimEvents } from 'coc-helper';
import { onError } from './util';

export const vimEvents = new HelperVimEvents<{
  CocStatusChange: () => void;
}>(
  {
    CocStatusChange: {
      eventExpr: 'User CocStatusChange',
    },
  },
  onError,
  {
    name: 'FloatinputStatus',
  },
);
