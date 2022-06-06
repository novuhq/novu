export const codeItems = [
  {
    name: 'Node.js',
    language: 'javascript',
    code: `import { Novu } from '@novu/node';
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
  `,
  },
  {
    name: 'Ruby',
    language: 'ruby',
    code: `$ gem install flagsmith

require "flagsmith"

flagsmith = Flagsmith.new("<<Your API KEY>>")

if flagsmith.get_value("font_size")
  #    Do something awesome with the font size
end

if flagsmith.feature_enabled?("does_not_exist")
  #do something
else
  #do nothing, or something else
end`,
  },
  {
    name: 'Python',
    language: 'python',
    code: `$ pip install flagsmith

from flagsmith import Flagsmith;

fs = Flagsmith(environment_id="QjgYur4LQTwe5HpvbvhpzK")

if fs.has_feature("header"):
  if fs.feature_enabled("header"):
    # Show my awesome cool new feature to the world

value = fs.get_value("header", '<My User Id>')

value = fs.get_value("header")

fs.set_trait("accept-cookies", "true", "ben@flagsmith.com))
fs.get_trait("accept-cookies", "ben@flagsmith.com"))`,
  },
  {
    name: 'Go',
    language: 'go',
    code: `$ go get github.com/flagsmith/flagsmith-go-client

  import (
    "github.com/flagsmith/flagsmith-go-client"
  )
  
  bt := bullettrain.DefaultBulletTrainClient("QjgYur4LQTwe5HpvbvhpzK")
  
  enabled, err := bt.FeatureEnabled("chat_widget")
  if err != nil {
      log.Fatal(err)
  } else {
      if (enabled) {
          fmt.Printf("Feature enabled")
      }
  }`,
  },
  {
    name: 'PHP',
    language: 'php',
    code: `composer require flagsmith/flagsmith-php-client

$fs = new Flagsmith('QjgYur4LQTwe5HpvbvhpzK');

$flags = $fs->getFlags();
foreach ($flags as &$value) {
    print_r($value);
}`,
  },
];
