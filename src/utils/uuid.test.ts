import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { newUuid } from './uuid';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

function setCrypto(value: unknown) {
  Object.defineProperty(globalThis, 'crypto', { value, configurable: true, writable: true });
}

describe('newUuid', () => {
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
  });

  it('makes a v4 id when randomUUID is missing, as on a plain http page', () => {
    setCrypto({ getRandomValues: (a: Uint8Array) => a.fill(7) });
    assert.match(newUuid(), V4);
  });

  it('still works with no crypto at all', () => {
    setCrypto(undefined);
    assert.match(newUuid(), V4);
  });
});
