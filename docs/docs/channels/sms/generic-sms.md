# Generic SMS

The Custom SMS provider allows you to send transactional SMS messages through your own SMS service using the Novu Platform.

## Getting Started

To use the Custom SMS provider within the SMS channel, you'll need to have your own SMS service or access to a service provider that supports sending SMS messages using an API endpoint. You will also need to configure the following parameters in the Custom SMS integration on the Novu platform:

- `BaseUrl`: The endpoint URL of your SMS service provider.
- `API Key Request Header`: The request header used for authenticating with the SMS service ex. `x-api-key`.
- `API Key`: Your API key for authenticating with the SMS service.
- `Secret Key Request Header` (optional): If your SMS service requires a secret key for authentication, specify the request header used for authenticating with the SMS service.
- `Secret Key` (optional): If your SMS service requires a secret key for authentication.
- `Id Path`: The path to the message ID in the response from the SMS service.
- `Date Path`: The path to the message date in the response from the SMS service.
- `From`: The sender information you want to appear on the SMS (e.g., your company name or phone number).
- `Authenticate by token` (optional): If your SMS service requires authentication by token, set this to `true` this option will use the `API key` and `Secret key` to get the access token.
- `Auth URL` (optional): The endpoint URL of your SMS service provider for authentication.
- `Authentication Token Key` (optional): The key of the authentication token in the response from the SMS service.

## Setting Up Custom SMS Integration with Novu

Follow these steps to create a Custom SMS integration with Novu:

- **Visit the Integrations Store Page on Novu:** Log in to your Novu account and navigate to the "Integrations Store" page.
- **Locate Custom SMS Provider:** You will find "Custom SMS" under SMS Section and click on it to open the integration setup.
- **Enter Your SMS Service Credentials:** In the integration setup, provide the following information:
  - `BaseUrl`: Fill in the endpoint URL of your SMS service provider.
  - `API Key Request Header`: Specify the request header used for authenticating with the SMS service.
  - `API Key`: Enter your API key for authentication.
  - `Secret Key Request Header` (optional): If your SMS service requires a secret key, specify the request header used for authenticating with the SMS service.
  - `Secret Key` (optional): If your SMS service requires a secret key, enter it here.
  - `From`: Specify the sender information you want to display on the SMS messages.
- **Activate the Integration:** Click on the "Disabled" button to switch it to "Active."

Once you've completed these steps, you can send notifications using the Custom SMS provider through Novu's platform.
