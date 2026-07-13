import { describe, expect, it } from 'vitest';
import { assertSafePublicUrl, isPrivateAddress } from './brand-analysis';

describe('secure brand website analysis', () => {
  it.each(['127.0.0.1', '10.0.0.5', '172.16.0.1', '192.168.1.4', '169.254.1.1', '::1', 'fc00::1'])('blocks private address %s', address => {
    expect(isPrivateAddress(address)).toBe(true);
  });
  it('rejects local, credentialed and non-http URLs before fetching', async () => {
    await expect(assertSafePublicUrl('http://localhost/admin')).rejects.toThrow(/privados/);
    await expect(assertSafePublicUrl('http://user:pass@127.0.0.1')).rejects.toThrow(/públicas/);
    await expect(assertSafePublicUrl('file:///etc/passwd')).rejects.toThrow(/públicas/);
  });
});
