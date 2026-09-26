import { createServer } from 'node:http';
import metadata from '../package.json' with { type: 'json' };
import { calculateQuote } from './quote.js';
import { RequestError } from './validation.js';

export const MAX_BODY_BYTES = 16 * 1024;

function reply(response, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(body);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let length = 0;
    let chunks = [];
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      chunks = [];
      reject(error);
    };
    request.on('data', (chunk) => {
      if (settled) return;
      length += chunk.length;
      if (length > MAX_BODY_BYTES) {
        fail(new RequestError('BODY_TOO_LARGE', `The body must not exceed ${MAX_BODY_BYTES} bytes.`, 413));
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (settled) return;
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
        const input = JSON.parse(text);
        settled = true;
        resolve(input);
      } catch {
        fail(new RequestError('INVALID_JSON', 'The body must contain valid UTF-8 JSON.'));
      }
    });
    request.on('aborted', () => fail(new RequestError('INVALID_REQUEST', 'The request was aborted.')));
    request.on('error', () => fail(new RequestError('INVALID_REQUEST', 'The request body could not be read.')));
  });
}

export function createQuoteServer({ buildCommit = process.env.BUILD_COMMIT || 'unknown' } = {}) {
  return createServer({ requestTimeout: 15_000, headersTimeout: 10_000, maxHeaderSize: 16 * 1024 }, async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (pathname === '/healthz' || pathname === '/version') {
        request.resume();
        if (request.method !== 'GET') {
          reply(response, 405, { code: 'METHOD_NOT_ALLOWED' }, { Allow: 'GET' });
          return;
        }
        reply(response, 200, pathname === '/healthz'
          ? { status: 'ok' }
          : { name: metadata.name, version: metadata.version, buildCommit });
        return;
      }
      if (pathname !== '/quotes') {
        request.resume();
        reply(response, 404, { code: 'NOT_FOUND' });
        return;
      }
      if (request.method !== 'POST') {
        request.resume();
        reply(response, 405, { code: 'METHOD_NOT_ALLOWED' }, { Allow: 'POST' });
        return;
      }
      const contentType = (request.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (contentType !== 'application/json') {
        request.resume();
        throw new RequestError('UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.', 415);
      }
      const input = await readJson(request);
      reply(response, 200, calculateQuote(input));
    } catch (error) {
      if (response.destroyed || response.writableEnded) return;
      if (error instanceof RequestError) {
        reply(response, error.statusCode, { code: error.code, message: error.message });
      } else {
        reply(response, 500, { code: 'INTERNAL_ERROR' });
      }
    }
  });
}
