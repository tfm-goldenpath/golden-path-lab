import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateQuote } from '../src/quote.js';
import { validateQuote, RequestError } from '../src/validation.js';

for (const [amount, basic, extended] of [
  [100, 1, 2], [101, 2, 3], [149, 2, 3], [150, 2, 3],
  [151, 2, 4], [100_000, 1000, 2000], [100_000_000, 1_000_000, 2_000_000],
]) {
  test(`integer tariffs for ${amount} cents`, () => {
    for (const [coverage, expected] of [['basic', basic], ['extended', extended]]) {
      assert.deepEqual(calculateQuote({ insuredAmountCents: amount, coverage }), {
        currency: 'EUR', premiumCents: expected, tariffVersion: 'demo-v1',
      });
    }
  });
}

for (const input of [
  null, [], 'quote', true, 100, {}, { coverage: 'basic' }, { insuredAmountCents: 100 },
  { insuredAmountCents: 100, coverage: 'basic', extra: true },
  ...[-100, 0, 99, 100_000_001, 100.5, '100', null, NaN, Infinity, Number.MAX_SAFE_INTEGER]
    .map((insuredAmountCents) => ({ insuredAmountCents, coverage: 'basic' })),
  ...['unknown', '', 'BASIC', null, 1, {}, ['basic']]
    .map((coverage) => ({ insuredAmountCents: 100, coverage })),
]) {
  test(`reject invalid input ${JSON.stringify(input)}`, () => {
    assert.throws(() => calculateQuote(input), (error) => (
      error instanceof RequestError && error.code === 'INVALID_REQUEST' && error.statusCode === 400
    ));
  });
}

test('validation returns a separate value and never mutates the input', () => {
  const input = Object.freeze({ insuredAmountCents: 100, coverage: 'basic' });
  const validated = validateQuote(input);
  assert.deepEqual(validated, input);
  assert.notEqual(validated, input);
});
