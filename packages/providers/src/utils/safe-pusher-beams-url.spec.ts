import { expect, test } from 'vitest';
import { resolveSafePusherBeamsBaseUrl } from './safe-pusher-beams-url';

test('accepts valid instance IDs', () => {
  const baseUrl = resolveSafePusherBeamsBaseUrl('my-instance_123');

  expect(baseUrl).toBe(
    'https://my-instance_123.pushnotifications.pusher.com/publish_api/v1/instances/my-instance_123'
  );
});

test('rejects instance IDs with URL delimiters', () => {
  expect(() => resolveSafePusherBeamsBaseUrl('internal.example/path?x=')).toThrow(
    'Pusher Beams instance ID blocked: Invalid instance ID format.'
  );
});

test('rejects instance IDs with embedded credentials', () => {
  expect(() => resolveSafePusherBeamsBaseUrl('evil@internal')).toThrow(
    'Pusher Beams instance ID blocked: Invalid instance ID format.'
  );
});

test('rejects empty instance IDs', () => {
  expect(() => resolveSafePusherBeamsBaseUrl('')).toThrow(
    'Pusher Beams instance ID blocked: Invalid instance ID format.'
  );
});
