import { Confirm } from './Components/Confirm';
import { IntInput } from './Components/IntInput';
import { NumberInput } from './Components/NumberInput';
import { StringInput } from './Components/StringInput';

const stringInput_ = new StringInput();
const numberInput_ = new NumberInput();
const intInput_ = new IntInput();
const confirm_ = new Confirm();

export namespace FloatingUI {
  export const stringInput = stringInput_.input.bind(stringInput_);
  export const numberInput = numberInput_.input.bind(numberInput_);
  export const intInput = intInput_.input.bind(intInput_);

  export function confirm<Value extends string = 'yes' | 'no'>(
    options: Confirm.Options<Value>,
  ) {
    return (confirm_ as Confirm<Value>).input(options);
  }

  // TODO
  // Vim API
  // - select / search
  // - checkbox
}
