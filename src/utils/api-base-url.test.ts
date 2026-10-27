import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveApiBaseUrl } from '../config/env';

const localApi = 'http://localhost:4000/api/v1';

describe('resolveApiBaseUrl', () => {
  it('keeps the configured URL when there is no page hostname (SSR)', () => {
    assert.equal(resolveApiBaseUrl(localApi), localApi);
  });

  it('rewrites localhost to the LAN hostname the phone opened', () => {
    assert.equal(resolveApiBaseUrl(localApi, '192.168.4.117'), 'http://192.168.4.117:4000/api/v1');
  });

  it('rewrites a stored LAN IP back to localhost when opened on this Mac', () => {
    assert.equal(resolveApiBaseUrl('http://192.168.4.117:4000/api/v1', 'localhost'), localApi);
  });

  it('does not rewrite a remote production API', () => {
    assert.equal(
      resolveApiBaseUrl('https://api.example.com/api/v1', '192.168.4.117'),
      'https://api.example.com/api/v1',
    );
  });
});
