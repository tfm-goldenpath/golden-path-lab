import { validateQuote } from './validation.js';

const PERCENT_BY_COVERAGE = Object.freeze({ basic: 1, extended: 2 });
export const TARIFF_VERSION = 'demo-v1';

export function calculateQuote(input) {
  const { insuredAmountCents, coverage } = validateQuote(input);
  // Integer numerator and ceiling division avoid floating-point percentage arithmetic.
  const numerator = insuredAmountCents * PERCENT_BY_COVERAGE[coverage];
  return {
    currency: 'EUR',
    premiumCents: Math.floor((numerator + 99) / 100),
    tariffVersion: TARIFF_VERSION,
  };
}
