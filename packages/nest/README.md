# NestJS Module Wrapper

A NestJS module wrapper for [@notifire/core](https://github.com/notifirehq/notifire)

## Usage

Initializing module with templates and providers:
```javascript
    import { NotifireModule } from "@notifire/nest";

    @Module({
      imports: [
        NotifireModule.forRoot({
          providers: [
            new SendgridEmailProvider({
              apiKey: process.env.SENDGRID_API_KEY,
              from: 'sender@mail.com',
            }),
          ],
          templates: [
            {
              id: 'password-reset',
              messages: [
                {
                  subject: 'Your password reset request',
                  channel: ChannelTypeEnum.EMAIL,
                  template: `
                          Hi {{firstName}}!

                          To reset your password click <a href="{{resetLink}}">here.</a>
                          `,
                },
              ],
            },
          ],
        }),
      ],
    })
```

Using notifire's singelton service in other services and modules:

```javascript
import { Injectable, Inject } from '@nestjs/common';
import { NOTIFIRE } from '@notifire/nest';

@Injectable()
export class UserService {
  constructor(@Inject(NOTIFIRE) private readonly notifire) {}

  async triggerEvent() {
    await this.notifire.trigger('password-reset', {
      $email: 'reciever@mail.com',
    });
  }
}
```