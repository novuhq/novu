import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchUnreachableAttachmentBytes,
  isHydratableAttachmentUrl,
  MAX_HYDRATED_ATTACHMENT_BYTES,
} from './attachment-url';

describe('isHydratableAttachmentUrl', () => {
  it('allows loopback LocalStack URLs', () => {
    expect(isHydratableAttachmentUrl('http://localhost:4566/novu-local/photo.png')).toBe(true);
    expect(isHydratableAttachmentUrl('http://127.0.0.1:4566/report.pdf')).toBe(true);
    expect(isHydratableAttachmentUrl('http://[::1]:4566/report.pdf')).toBe(true);
  });

  it('rejects metadata, private-network, and non-http URLs', () => {
    expect(isHydratableAttachmentUrl('http://169.254.169.254/latest/meta-data/iam/security-credentials/')).toBe(false);
    expect(isHydratableAttachmentUrl('http://10.0.0.5/secret')).toBe(false);
    expect(isHydratableAttachmentUrl('http://192.168.1.1/admin')).toBe(false);
    expect(isHydratableAttachmentUrl('http://[::ffff:169.254.169.254]/latest/meta-data/')).toBe(false);
    expect(isHydratableAttachmentUrl('http://localhost@169.254.169.254/latest/meta-data/')).toBe(false);
    expect(isHydratableAttachmentUrl('file:///etc/passwd')).toBe(false);
    expect(isHydratableAttachmentUrl('http://localhost.attacker.com/file')).toBe(false);
  });
});

describe('fetchUnreachableAttachmentBytes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepts a payload in the 10–25 MiB ingress range', async () => {
    const bytes = new Uint8Array(12 * 1024 * 1024);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        arrayBuffer: async () => bytes.buffer,
      })
    );

    const result = await fetchUnreachableAttachmentBytes('http://localhost:4566/report.pdf');

    expect(result?.byteLength).toBe(12 * 1024 * 1024);
  });

  it('returns null for an attachment over the ingress cap without throwing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'content-length' ? String(MAX_HYDRATED_ATTACHMENT_BYTES + 1) : null,
      },
      arrayBuffer: async () => {
        throw new Error('should not download an over-budget attachment');
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchUnreachableAttachmentBytes('http://localhost:4566/huge.pdf')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fetch link-local metadata or private-network URLs', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchUnreachableAttachmentBytes('http://169.254.169.254/latest/meta-data/iam/security-credentials/')
    ).resolves.toBeNull();
    await expect(fetchUnreachableAttachmentBytes('http://10.0.0.5/secret.pdf')).resolves.toBeNull();
    await expect(fetchUnreachableAttachmentBytes('file:///etc/passwd')).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
