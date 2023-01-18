# Telegram

Using Telegram provider you can send messages to telegram channels, groups and individual users, for this you need to create a bot using Botfather and add that bot as admin to the channel and for group you can add as admin or member.

## How to create telegram bot and get bot token

Let's follow below steps to get bot token(API token):

1. Open a chat with [@BotFather](https://telegram.me/BotFather) in Telegram and click the /start command.
2. Use the command "/newbot" to create a new bot. The BotFather will ask you for a name and a username for your bot.
3. Give the Telegram bot a unique username. Note that the bot name must end with the word "bot" (case-insensitive).
4. Once you have chosen a name and username, the BotFather will create new bot and provide you with an API token. This token is used to authenticate your bot when it interacts with the Telegram bot API.
   [For more details](https://core.telegram.org/bots/features#creating-a-new-bot)

## Create a Telegram integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Telegram and click on the **Connect** button.
- Enter your Bot token(API Key) got above.
- Click on the **Save** button.
- You should now be able to send notifications using Telegram in Novu to any telegram channel/group/user.

## Connect our subscribers to telegram channel/group/user

To connect our subscribers we need to get chat_id, to get chat_id for channel/group follow below steps:

1. Add your bot to telegram channel as admin and for group add as member.
2. send a test message for your channel/group
3. Get the list of updates for your BOT using bot REST API
4. You get messages like this: "message":{"message_id":16,"from":{"id":123,"is_bot":false,"first_name":"xx","last_name":"yy","username":"xyz"},"chat":{"id":**-1001874782164**,"title":"xxx","username":"yyy","type":"supergroup"},"date":1673878544,"text":"test message"}}

   In the above message your channel/group chat_id is **-1001874782164**

To get chat_id for individual user:

1. Start conversation with your bot by clicking start command (Bot can send only messages to users only after they start conversation with Bot)
2. Get the list of updates for your BOT using bot REST API

3. You get start command message like this: "message":{"message_id":25,"from":{"id":1963157195,"is_bot":false,"first_name":"xx","last_name":"yy","username":"SyamaThota","language_code":"en"},"chat":{"id":**1963157195**,"first_name":"xx","last_name":"yy","username":"xx","type":"private"},"date":1673888213,"text":"/start","entities":[{"offset":0,"length":6,"type":"bot_command"}]}}]}

In the above message your chat_id is **1963157195**

Update the subscriber credentials using the chat_id you got above and Telegram provider id:

You can do this step by using the `@novu/node` library

```typescript
import { Novu, ChatProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.setCredentials('subscriberId', ChatProviderIdEnum.Telegram, {
  chatUserId: <chat_id>,
});
```

For public channel/group you can also use the user name of the channel/group(like @NovuTest123) instead of chat_id.

- `subscriberId` is a custom identifier used when identifying your users within the Novu platform.
- `providerId` is a unique provider identifier. We recommend using our ChatProviderIdEnum to specify the provider.
- The third parameter is the credentials object. In this case, we use the `chatUserId` property to specify the telegram username/chat_id of the channel/group/user.

<!-- markdownlint-disable MD029 -->

6. You are all set up and ready to send your first chat message via our `@novu/node` package or directly using the REST API.
<!-- markdownlint-enable MD029 -->

## Trouble schooting tips

After all steps followed if you still face problems plaese make sure:

1. Channel and group chat_id starts with -100
2. Make sure your telegram bot is added as admin to the channel you wish to send messages
3. Make sure your bot is added as member to the group you wish to send messages
4. If you are trying to send mesage to individual user make sure user started communication with your bot and still
5. Make sure you configured your bot token properly in Novu integration, token looks similar to this 5532049960:AAEs1234AAl9T45Nm1234i59NwwEy6V-viM
6. You can send message directly to the channel/group/user by using telegram bot REST API and check if you are able to send message properly or get any error.

   Please note: For **indivudual users** the above instructions are just for testing purpose, but for practical use cases you may need to write bot program to collect chat_ids of users who start the conversation with your bot and associate the chat_id with your users and updated credentials of those subscribers in novu system.
