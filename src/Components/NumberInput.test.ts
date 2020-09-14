import { NumberInput } from './NumberInput';

test('NumberInput.validateContent', async () => {
  // @ts-expect-error
  const validateContent = NumberInput.prototype.validateContent;
  expect(await validateContent('1')).toBe(true);
  expect(await validateContent('1.2')).toBe(true);
  expect(await validateContent('.2')).toBe(true);
  expect(await validateContent('..2')).toBe(false);
  expect(await validateContent('1..2')).toBe(false);
  expect(await validateContent('1.')).toBe(false);
  expect(await validateContent('')).toBe(false);
  expect(await validateContent('a')).toBe(false);
});
