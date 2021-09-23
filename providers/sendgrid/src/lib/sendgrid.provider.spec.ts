import sendgridMail from '@sendgrid/mail';

import { SendgridEmailProvider } from './sendgrid.provider';

test('should trigger sendgrid correctly', async () => {
  const provider = new SendgridEmailProvider({
    apiKey: 'SG.1234',
    from: 'test@tet.com',
  });
  const spy = jest.spyOn(sendgridMail, 'send').mockImplementation(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {} as any;
  });
  await provider.sendMessage({
    to: 'test@test2.com',
    subject: 'test subject',
    html: '<div> Mail Content </div>',
  });
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: 'test@tet.com',
    html: '<div> Mail Content </div>',
    subject: 'test subject',
    substitutions: {},
    to: 'test@test2.com',
  });
});
