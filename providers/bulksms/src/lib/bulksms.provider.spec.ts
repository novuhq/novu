import { BulkSmsSmsProvider } from './bulksms.provider';

test('should trigger bulkSms library correctly', async () => {
 
  const BASE_URL = 'http://login.bulksmsoffers.com/api/sendhttp.php?';
  const authKey = 'YourAuthKey';
  const mobileNumber = '9999999';
  const sender = '102234';
  const message = 'Test message';
  const route = 'default';

  const url =
      BASE_URL +
      'authkey=' +
      authKey +
      '&mobiles=' +
      mobileNumber +
      '&message=' +
      message +
      '&sender=' + sender + '&route=' + route ;

  const response = await fetch(url.toString());

    const body = await response.text();
    

    return {
      id: body
      
    };
});
