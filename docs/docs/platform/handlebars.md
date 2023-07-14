---
sidebar_position: 14
sidebar_label: Handlebars
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Handlebars

You can customise the notification the end users get using Handlebars. This is crucial for many cases, for example, when using the [digest engine](https://docs.novu.co/platform/digest/). 

To be able to write handlebar templates to suit your needs, you'll first need to know the properties you have access to. Novu lets you access the following properties:

| Property           | Description                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `step.events`      | An array of all the events aggregated under in digest. This will be the "payload" object passed to each `trigger.event` sent in the digest period |
| `step.total_count` | The number of total events in this digest                                                                                                           |
| `step.digest`      | A `boolean` flag to indicate if we are in a digest mode right now        

In addition to these properties, we support the following functions:

| Function           | Description                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{{#each array}}`<br/>`...`<br/>`{{/each}}`      | This helps you iterate over an array.  |
| `unique array "key"`      | It lists all the unique values from an array, when iterating over it. So for the array `[{ name: 'dog' }, { name: 'cat' }, { name: 'dog' }]`, <br/>if we iterate over the `animals` array and write`unique animals "name"`, we'll get 'dog' and 'cat' once each, even though dog appears twice in the array.|
| `{{equals item1 item2}}` | This lets you check equality of `item1` and `item2`.                                                                                                            |
| `<div>`<br/>`{{name}}`<br/>`</div>`      | You can render custom HTML by directly using these tags and placing variables in double braces as shown. <br/><br/> So, for `name:'Hello World'`, `<div>{{name}}</div>` would generate a separate div with 'Hello World' in it. |
| `<div>`<br/>`{{name}}`<br/>`</div>`      | If your data has apostrophe in it, to ensure that it contains the apostrophe in the render as well, do the following:<br/><br/>Change `name:'John' Doe'` to `name:"John' Doe"` to preserve the apostrophe after the first name.|
| `{{#if test_condition}}`<br/>`...`<br/>`{{else}}`<br/>`...`<br/>`{{/if}}`      | This lets you write conditional statements.  |
| `{pluralize variable “notification” “notifications”}}`      | This checks the if the value of `variable` is more than 1 or not. It it is, it will use plural value - `notifications` and if it isn't, singular value will be used - `notification`.  |
| `{{dateFormat date 'EEEE, MMMM Do yyyy'}}`      | You can format date using the `dateFormat` function. Here, `date: '2020-01-01` has been formatted into `Wednesday, January 1st 2020`.|
| `{{lowercase key}}`      | This helps you use the `lowercase` handlebar helper function and turns the value of the specified key to its lower case value. So, for `message: 'hEllo WORLD'`, if we write `{{lowercase message}}`, we'll end up with `hello world`|
| `{{uppercase key}}`      | This helps you use the `uppercase` handlebar helper function and turns the value of the specified key to its upper case value. So, for `message: 'hello woRld'`, if we write `{{uppercase message}}`, we'll end up with `HELLO WORLD`|
| `{{titlecase key}}`      | This helps you use the `titlecase` handlebar helper function and turns the value of the specified key to its title case value. So, for `message: 'hEllo wOrLD'`, if we write `{{titlecase message}}`, we'll end up with `Hello World`|
| `{groupby}}`      | Using `groupby`, you can organize data using a specified key. <br /> <br />For example, say we have an array called `names` with the following:`[{name: 'Name 1',age: '30',},{name: 'Name 2',age: '31',},{name: 'Name 1',age: '32',}{name: 'Name 2',age: '34',},]` <br/> <br />If we want to organize this information and generate separate divs for each `name`, we can achieve it by iterating over the array and using `groupby` like this:  <br /><br/>`{{#each (groupby names "name")}}<div>{{key}}</div>{{#each items}}{{age}}-{{/each}}{{/each}}` <br /> <br />Here, we're first looping over the array and grouping the data using the key `name`. <br/>Then for each item of the current group, we're iterating again to output the value of property name `age` for each item in the group. <br/>So our final output is: `<div>Name 1</div> 30-32- <div>Name 2</div> 31-34`

By combining the functions and properties above, we can get some powerful results. Let's take a look at some scenarios and how you can achieve them:

1. Suppose you're writing a social media app and you want your users to be notified once every 8 hrs as to how many comments they received in the last 8 hours.

To achieve this, you can create a workflow with digest node and set the duration to 8 hours. Then in the workflow editor, you can use the following:
`{{step.total_count}} liked your photo!`

:::info
Note: The `step.total_count` gives the total number of events in the digest period. Be careful when using this if you have multiple types of notifications being triggered as it will just output the total number of notifications triggered during the digest period.
:::

2. Order dispatch info notification - Say you're writing an e-commerce app and you want to send an order dispatch notification. You can do so easily:

`We have dispatched your order {{order_number}} and it should reach you in {{estimated_delivery_time}}.`

3. Sale promotional notifications - Staying in the e-commerce context, say you're running a sale on your e-commerce app. 

There's a promotion you want to notify your users about. You can achieve this by:
`{{user_name}}, don't miss out on this exclusive offer! Use code {{coupon_code}} for {{discount_percentage}} off your purchase.`
