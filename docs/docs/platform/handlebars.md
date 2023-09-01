---
sidebar_position: 14
sidebar_label: Handlebars
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Handlebars Template

You can customize the notification (appearance and structure) the end users get using Handlebars. This is crucial for many cases, for example, when using the [digest engine](https://docs.novu.co/platform/digest/).

## Properties and their description

To be able to write handlebar templates to suit your needs, you'll first need to know the properties you have access to. Novu lets you access the following properties:

| Property           | Description                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `step.events`      | An array of all the events aggregated under in digest. This will be the "payload" object passed to each `trigger.event` sent in the digest period |
| `step.total_count` | The number of total events in this digest                                                                                                         |
| `step.digest`      | A `boolean` flag to indicate if we are in a digest mode right now                                                                                 |

## Functions and their description

In addition to these properties, we also support the following functionality:

| Function                                                                  | Description                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{{#each array}}`<br/>`...`<br/>`{{/each}}`                               | This helps you iterate over an array.                                                                                                                                                                                                                                                                       |
| `unique array "key"`                                                      | It lists all the unique values from an array when iterating over it. So for the array `[{ name: 'dog' }, { name: 'cat' }, { name: 'dog' }]`, <br/>if we iterate over the `animals` array and write`unique animals "name"`, we'll get 'dog' and 'cat' once each, even though dog appears twice in the array. |
| `{{equals item1 item2}}`                                                  | This lets you check equality of `item1` and `item2`.                                                                                                                                                                                                                                                        |
| `<div>`<br/>`{{name}}`<br/>`</div>`                                       | You can render custom HTML by directly using these tags and placing variables in double braces as shown. <br/><br/> So, for `name:'Hello World'`, `<div>{{name}}</div>` would generate a separate div with 'Hello World' in it.                                                                             |
| `<div>`<br/>`{{name}}`<br/>`</div>`                                       | If your data has apostrophe in it, to ensure that it contains the apostrophe in the render as well, do the following:<br/><br/>Change `name: 'John' Doe'` to `name: "John' Doe"` to preserve the apostrophe after the first name.                                                                           |
| `{{#if test_condition}}`<br/>`...`<br/>`{{else}}`<br/>`...`<br/>`{{/if}}` | This lets you write conditional statements.                                                                                                                                                                                                                                                                 |
| `{pluralize variable “notification” “notifications”}}`                    | This checks the if the value of `variable` is more than 1 or not. It it is, it will use a plural value - `notifications` and if it isn't, a singular value will be used - `notification`.                                                                                                                   |
| `{{dateFormat date 'EEEE, MMMM Do yyyy'}}`                                | You can format the date using the `dateFormat` function. Here, `date: '2020-01-01` has been formatted into `Wednesday, January 1st 2020`.                                                                                                                                                                   |
| `{{lowercase key}}`                                                       | This helps you use the `lowercase` handlebar helper function and turns the value of the specified key to its lowercase value. So, for `message: 'hEllo WORLD'`, if we write `{{lowercase message}}`, we'll end up with `hello world`                                                                        |
| `{{uppercase key}}`                                                       | This helps you use the `uppercase` handlebar helper function and turns the value of the specified key to its uppercase value. So, for `message: 'hello woRld'`, if we write `{{uppercase message}}`, we'll end up with `HELLO WORLD`                                                                        |
| `{{titlecase key}}`                                                       | This helps you use the `titlecase` handlebar helper function and turns the value of the specified key to its titlecase value. So, for `message: 'hEllo wOrLD'`, if we write `{{titlecase message}}`, we'll end up with `Hello World`                                                                        |

## Use-cases and examples

By combining the functions and properties above, we can get some powerful results. Let's take a look at some scenarios and how you can achieve them:

1. Suppose you're writing a social media app and you want your users to be notified once every 8 hrs as to how many comments they received in the last 8 hours.<br/><br/>To achieve this, you can create a workflow with a digest node and set the duration to 8 hours. Then in the workflow editor, you can use the following:
   `{{step.total_count}} liked your photo!`

:::info
Note: The `step.total_count` gives the total number of events in the digest period. Be careful when using this if you have multiple types of notifications being triggered as it will just output the total number of notifications triggered during the digest period.
::: 2. Ternary operator use-case - If you want to use ternary operator in the template, you can do so like this:
`{{#equals array.length 2}} do something {{else}} do something else {{/equals}}`. <br/><br/>Here, if the `array.length` is `2`, `do something` block will be executed and if it isn't then `do something else` will be executed.<br/><br/> For example, <br/>
`{{#equals unreadMessages.length 2}}`<br/>`You have 2 new messages.`<br/>`{{else}}`<br/>`You have {{unreadMessageslength}} new messages.`<br/>`{{/equals}}`<br/><br/> 3. If you've an array of objects in your payload and you want to iterate over them and send dynamic notifications, you can do so like this:<br/><br/>
Payload data:<br/>`const payload = {`
`array: [`<br/>
`{`
`name: 'John',`
`score: 8,`
`},`
`{`
`name: 'Emily',`
`score: 6,`
`},`
`{`
`name: 'Michael',`
`score: 9,`
`},`
`],`
`};`<br/><br/>
Template:
`{{#each array}}`
`Hi {{name}}! You have {{score}} points.`
`{{/each}}`

## Next steps

To learn more about Novu's digest engine and how to use it, check out [Novu Digest Engine](https://docs.novu.co/platform/digest).
