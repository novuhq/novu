import * as safeOutboundHttp from '@novu/shared/utils/safe-outbound-http';
import { expect, test, vi } from 'vitest';
import { GithubSignalsProvider } from './github-signals.provider';

test('calls repository_dispatch with token, owner, repo, and event_type', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue({
    statusCode: 204,
    statusMessage: 'No Content',
    headers: {},
    body: undefined,
  });

  const provider = new GithubSignalsProvider({
    token: 'ghp_test_token',
    owner: 'novuhq',
    repo: 'novu',
    eventType: 'novu_signal',
  });

  const result = await provider.sendMessage({
    content: 'deploy now',
    customData: { environment: 'prod' },
  });

  expect(safeOutboundSpy).toHaveBeenCalledWith({
    url: 'https://api.github.com/repos/novuhq/novu/dispatches',
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ghp_test_token',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      event_type: 'novu_signal',
      client_payload: {
        content: 'deploy now',
        environment: 'prod',
      },
    }),
  });
  expect(result.date).toBeDefined();

  safeOutboundSpy.mockRestore();
});
