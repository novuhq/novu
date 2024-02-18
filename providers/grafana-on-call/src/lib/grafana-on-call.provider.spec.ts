import { GrafanaOnCallChatProvider } from './grafana-on-call.provider';
import axios from 'axios';

test('should trigger grafana-on-call library correctly', async () => {
  const date = new Date();
  const fakePost = jest.fn(() => {
    return { headers: { ['Date']: date } };
  });

  jest.spyOn(axios, 'create').mockImplementation(() => {
    return {
      post: fakePost,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  const provider = new GrafanaOnCallChatProvider({
    alertUid: '123',
    externalLink: 'link',
    imageUrl: 'url',
    state: 'ok',
    title: 'title',
  });

  const testWebhookUrl = 'https://mycompany.webhook.grafana.com/';
  const testContent = 'warning!!';
  const res = await provider.sendMessage({
    webhookUrl: testWebhookUrl,
    content: testContent,
  });

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(testWebhookUrl, {
    alert_uid: '123',
    link_to_upstream_details: 'link',
    image_url: 'url',
    state: 'ok',
    title: 'title',
    message: testContent,
  });
  expect(res).toEqual({ id: expect.any(String), date: date.toISOString() });
});
