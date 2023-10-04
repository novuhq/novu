import { WhatsappBusinessChatProvider } from './whatsapp-business.provider';

const mockConfig = {
    apiKey: "TEST_API_KEY",
    apiVersion: "TEST_API_VERSION",
    applicationId: "TEST_APPLICATION_ID"
};

const mockMessage = {
  channel: "phone_number",
  content: JSON.stringify({
		"name": "template_request",
		"language": {
			"code": "it"
		},
		"components": [
			{
				"type": "header",
				"parameters": [
					{
						"type": "text",
						"text": "135345345"
					}
				]
			},
			{
				"type": "body",
				"parameters": [
					{
						"type": "text",
						"text": "135345345"
					},
					{
						"type": "text",
						"text": "135345345"
					},
					{
						"type": "text",
						"text": "135345345"
					}
				]
			},
			{
				"type": "button",
				"sub_type": "quick_reply",
				"index": "0",
				"parameters": [
					{
						"type": "payload",
						"payload": "test"
					}
				]
			}
		]
	})
}

test('should trigger whatsapp-business library correctly', async () => {

  const provider = new WhatsappBusinessChatProvider(mockConfig) 

  await provider.sendMessage(mockMessage);

  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        id: '67890-test',
        date: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage(mockMessage);

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith(mockMessage);


});
