export const MIN_AMOUNT_CENTS = 100;
export const MAX_AMOUNT_CENTS = 100_000_000;
export const COVERAGES = Object.freeze(['basic', 'extended']);

export class RequestError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'RequestError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function validateQuote(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new RequestError('INVALID_REQUEST', 'A JSON object is required.');
  }
  const fields = Object.keys(input);
  if (fields.length !== 2 || !fields.includes('insuredAmountCents') || !fields.includes('coverage')) {
    throw new RequestError('INVALID_REQUEST', 'Only insuredAmountCents and coverage are accepted.');
  }
  if (!Number.isSafeInteger(input.insuredAmountCents)
      || input.insuredAmountCents < MIN_AMOUNT_CENTS
      || input.insuredAmountCents > MAX_AMOUNT_CENTS) {
    throw new RequestError('INVALID_REQUEST', 'insuredAmountCents must be an integer between 100 and 100000000.');
  }
  if (!COVERAGES.includes(input.coverage)) {
    throw new RequestError('INVALID_REQUEST', 'coverage must be basic or extended.');
  }
  return { insuredAmountCents: input.insuredAmountCents, coverage: input.coverage };
}
