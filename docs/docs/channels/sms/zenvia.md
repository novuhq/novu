# Zenvia

It is possible to use the [Zenvia](https://www.zenvia.com/) provider to send SMS and WhatsApp messages to the customers using the Novu Platform with a single API to create multi-channel experiences. Zenvia allow to send messages with specifics templates messages. Learn more in a doc [Zenvia Development Doc](https://devs.zenvia.com/)

## Getting Started

To use the Zenvia provider in the SMS or WhatsApp channel, the first step is to create a Zenvia account and add the personal token to the Zenvia integration on the Novu platform

## Get Zenvia Token

Go the Zenvia website and create and configure new sandbox channel (SMS or WhatsApp), finish the configuration and get your keyword (from parameter in novu integration).

## Configure Novu Integration

Add your Zenvia token:

![image](https://github.com/vocedm/novu/assets/141740861/aeb00dc9-9d0c-4fae-9cef-16a4040d0089)

## Sending with Novu

Create a new workflow in novu

1 - Add SMS to your workflow.

2 - Add a json in SMS flow in novu platform

2.1 - Normal message to send example.

- Example SMS:

  ```json SMS
  {
    "from": "Test",
    "type_provider": "SMS",
    "contents": [
      {
        "type": "text",
        "text": "message text"
      }
    ]
  }
  ```

- Example WHATSAPP:

  ```json SMS
  {
    "from": "Test",
    "type_provider": "WHATSAPP",
    "contents": [
      {
        "type": "text",
        "text": "message text"
      }
    ]
  }
  ```

  2.2 - Message to send with a template example

```json
{
  "contents": [
    {
      "type": "template",
      "templateId": "template_id",
      "fields": {
        "name": "Jhon",
        "product": "test"
      }
    }
  ]
}
```

![image](https://github.com/vocedm/novu/assets/141740861/257aa630-9e67-4a2f-a11f-5d4b64e8257f)

3: Set your Phone in parameter on Workflow Trigger.

![image](https://github.com/vocedm/novu/assets/23130033/1795bd48-3b60-4efd-9f0e-83638c79cf14)
