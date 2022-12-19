import { BulkSmsSmsProvider } from './bulkSms.provider';

test1('should trigger bulkSms library correctly', async () => {
  const response1 = await fetch(
    'http://bulksmsoffers.com/',
    // Bulksms API url will be put here so that we can send sms to our clients (Ex - 'http://login.bulksmsoffers.com/'),
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  const data = await response1.json();

  return {
    id: 'yymd',
    date: '20221027',
  };
});
test2('should trigger bulkSms library correctly', async () => {
  /*
   * Demo of how bulksms works
   * Your authentication key
   */
  const authKey = 'YourAuthKey';

  //Multiple mobiles numbers separated by comma
  const mobileNumber = '9999999';

  //Sender ID,While using route4 sender id should be 6 characters long.
  const senderId = '102234';

  //Your message to send, Add URL encoding here.
  const message = 'Test message';

  //Define route
  const route = 'default';

  const payload = {
    authkey: authKey,
    mobiles: mobileNumber,
    message: message,
    sender: senderId,
    route: route,
  };

  const options = {
    method: 'post',
    payload: payload,
  };

  const res = UrlFetchApp.fetch('http://login.bulksmsoffers.com/api/sendhttp.php?', options);

  const resAsTxt = '' + res + '';

  Logger.log(resAsTxt);
});
