import { HelperVimEvents } from 'coc-helper';
import { logger } from './util';

export const vimEvents = new HelperVimEvents<{
  CocStatusChange: () => void;
}>(
  {
    CocStatusChange: {
      eventExpr: 'User CocStatusChange',
    },
  },
  logger,
  {
    name: 'Floatinput',
  },
);
