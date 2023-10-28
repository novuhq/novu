# Novu Messagebird Provider

A Messagebird sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

# MessageBird Node.js API Client

Welcome to the MessageBird Node.js API Client repository. This open-source library facilitates seamless integration with the MessageBird REST API, empowering developers to harness the power of SMS, Voice, and Chat functionalities within their applications. This Node.js client simplifies interaction with the MessageBird API, enabling the programmable sending of SMS messages, balance inquiries, and other operations.

## Prerequisites

To use this library effectively, you should have the following prerequisites in place:

1. **MessageBird Account**: Ensure you have an active MessageBird account. If you haven't already, you can sign up for a free MessageBird account at [MessageBird Signup](https://www.messagebird.com/en/sign-up).

2. **Access Key**: Generate an access key within the developers' section of your MessageBird account. This access key is essential for authenticating your requests to the MessageBird API.

3. **Node.js**: This library requires Node.js version 0.10 or higher (or io.js) to be installed on your system.

## Installation

To install the MessageBird Node.js client, use npm with the following command:

```bash
npm install messagebird
```

## Getting Started

The following guide explains how to set up and use the library for your development needs.

### Initialization

You can initialize the MessageBird client using either CommonJS or ES6 import syntax. Replace `<YOUR_ACCESS_KEY>` with your actual access key.

**CommonJS require syntax:**

```javascript
const messagebird = require('messagebird').initClient('<YOUR_ACCESS_KEY>');
```

**Typescript with ES6 import (or .mjs with Node >= v13):**

```javascript
import { initClient } from 'messagebird';
const messagebird = initClient('<YOUR_ACCESS_KEY>');
```

### Example: Checking Your Account Balance

Once the client is initialized, you can commence making API requests. Here's an example of how to retrieve your account balance:

```javascript
// Get your balance
messagebird.balance.read(function (err, data) {
  if (err) {
    return console.log(err);
  }
  console.log(data);
});
```

In the event of a successful response, you can expect an object similar to this:

```javascript
{
  payment: 'prepaid',
  type: 'credits',
  amount: 42.5
}
```

Should an error occur, the response may resemble the following:

```javascript
{
  [Error: api error],
  errors: [
    {
      code: 2,
      description: 'Request not allowed (incorrect access_key)',
      parameter: 'access_key'
    }
  ]
}
```

For comprehensive details on using the library and exploring the entire array of API endpoints, consult the official MessageBird documentation at [MessageBird Developers](https://developers.messagebird.com).

We wish you a productive and successful development journey!
