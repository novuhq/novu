---
sidebar_position: 1
draft: true
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Introduction Example

To create your free managed or docker based Novu environment use our CLI tool:

```
npx novu init
```

After creating your cloud or self-hosted account the next steps to sending your first notification are outlined in this guide.

## Code Snippet with Tabs

In this article, we’ll go over the benefits of planning for your webinar and top actionable tips to get you moving forward with your webinar marketing strategy.


<Tabs>
  <TabItem value="nodejs" label="Node.js" default>

```jsx
import { Novu } from '@novu/node';
const novu = new Novu(process.env.NOVU_API_KEY);
await novu.trigger('<TRIGGER_NAME>',
  {
    to: {
      subscriberId: '<UUNIQUE_IDENTIFIER>',
      email: 'john@doemail.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    payload: {
      name: "Hello World",
      organization: {
        logo: 'https://happycorp.com/logo.png',
      },
    },
  }
);
```

  </TabItem>
  <TabItem value="ruby" label="Ruby">

```ruby
$ gem install flagsmith

require "flagsmith"

flagsmith = Flagsmith.new("<<Your API KEY>>")

if flagsmith.get_value("font_size")
  #    Do something awesome with the font size
end

if flagsmith.feature_enabled?("does_not_exist")
  #do something
else
  #do nothing, or something else
end
```
  
  </TabItem>
  <TabItem value="py" label="Python">

```py
def hello_world():
  print("Hello, world!")
```

  </TabItem>
  <TabItem value="java" label="Java">

```java
class HelloWorld {
  public static void main(String args[]) {
    System.out.println("Hello, World");
  }
}
```

  </TabItem>
</Tabs>

## Table view component

In this article, we’ll go over the benefits of planning for your webinar and top actionable tips to get you moving forward with your webinar marketing strategy.

| Argument | Environment Variable           | Default Value | Description |
| -------- | ------------------------------ | ------------- | ----------- |
| `token`  | `ROOKOUT_TOKEN`                | None          | The Rookout token for your organization. Should be left empty if you are using a Rookout ETL Controller |
| `host `  | `ROOKOUT_CONTROLLER_HOST`      | None          | If you are using a Rookout ETL Controller, this is the hostname for it                                  |
| `port`   | `ROOKOUT_CONTROLLER_PORT`      | None          | If you are using a Rookout ETL Controller, this is the port for it |
| `debug`  | `ROOKOUT_DEBUG`                | False         | Set to `true` to increase log level to debug |
| `token`  | `ROOKOUT_TOKEN`                | None          | The Rookout token for your organization. Should be left empty if you are using a Rookout ETL Controller |
| `host `  | `ROOKOUT_CONTROLLER_HOST`      | None          | If you are using a Rookout ETL Controller, this is the hostname for it                                  |
| `port`   | `ROOKOUT_CONTROLLER_PORT`      | None          | If you are using a Rookout ETL Controller, this is the port for it |
| `debug`  | `ROOKOUT_DEBUG`                | False         | Set to `true` to increase log level to debug |

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Consequat, dolor posuere sed ultrices viverra lorem at scelerisque ut. Praesent amet venenatis gravida proin ac risus. Id eget.

## Callout component

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fermentum ridiculus aliquam, cras lectus egestas ac. Fermentum laoreet vulputate egestas mattis neque eget. Lectus lorem ac blandit lacus scelerisque eget. Risus ipsum urna suspendisse eros at. Varius sem sit sagittis mauris. Hendrerit accumsan varius tincidunt fermentum. Vulputate mauris elementum enim justo, dignissim tristique sed. Erat in et dui tellus ultricies feugiat ipsum. Aliquam pellentesque lorem id quis sed et vestibulum nibh faucibus. Aliquet amet urna, platea malesuada sed adipiscing auctor. Et ac parturient lobortis hendrerit porta condimentum felis. 

:::caution  Warning

Once you accept a synonym, you should only change it from the dashboard. Changing these synonyms with an API client can lead to data inconsistencies and should be avoided.

:::

:::note

If your index has replicas and you don’t want to copy accepted synonyms to these replicas, turn off the Forward to replicas setting at the top of the AI Optimization page.

:::

:::tip

If your index has replicas and you don’t want to copy accepted synonyms to these replicas, turn off the Forward to replicas setting at the top of the AI Optimization page.

:::

:::info

If your index has replicas and you don’t want to copy accepted synonyms to these replicas, turn off the Forward to replicas setting at the top of the AI Optimization page.

:::

:::danger

If your index has replicas and you don’t want to copy accepted synonyms to these replicas, turn off the Forward to replicas setting at the top of the AI Optimization page.

:::