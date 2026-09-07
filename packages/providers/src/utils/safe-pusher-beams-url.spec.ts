import { expect, test } from 'vitest';
import { resolveSafePusherBeamsBaseUrl } from './safe-pusher-beams-url';

test('accepts valid instance IDs', () => {
  const baseUrl = resolveSafePusherBeamsBaseUrl('my-instance_123');

  expect(baseUrl).toBe('https://my-instance_123.pushnotifications.pusher.com/publish_api/v1/instances/my-instance_123');
});

test('accepts mixed-case instance IDs', () => {
  const instanceId = 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890';
  const baseUrl = resolveSafePusherBeamsBaseUrl(instanceId);

  expect(baseUrl).toBe(`https://${instanceId}.pushnotifications.pusher.com/publish_api/v1/instances/${instanceId}`);
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
