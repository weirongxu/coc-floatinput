import { Input } from './Input'

export class IntInput extends Input<number> {
  protected async defaultString(): Promise<string> {
    return '0'
  }

  protected async valueToString(value: number): Promise<string> {
    return value.toString()
  }

  protected async stringToValue(str: string): Promise<number> {
    return parseInt(str, 10)
  }

  protected async validateContent(str: string): Promise<boolean> {
    return /^\s*[0-9]+\s*$/.test(str)
  }
}
