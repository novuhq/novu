# FAQ

Here we will outline some of the most common questions we get asked about the project. Missing a question? Feel free to open an [issue](https://github.com/novuhq/novu/issues) or PR to add it to the list.

<details>
<summary> What are the dependencies required to run Novu. </summary>

Novu consists of multiple services written in Node.js and Typescript. The following are the dependencies required to run the project fully:

- Node.js version v16.15.1
- MongoDB
- Redis
- File storage (S3/GCP/Azure) - Optional

</details>

<details>
<summary>How do I customize messages on Novu?</summary>

In Novu, [handlebar variables](https://handlebarsjs.com/guide/) (variables enclosed within double curly brackets) are used to customize messages. Using this, one can take advantage of the following tools:

- **Custom Variables:** You can create [custom variables](https://docs.novu.co/platform/templates#variable-usage) by defining it in the payload and accessing its value using the following syntax:

  ```html
  {{variable_name}}
  ```

- **Iteration/Looping:** You can iterate through a list of variables using [each](https://docs.novu.co/platform/templates#iteration) keyword. The code within the block will loop once for each element that is present in the iterable variable. The syntax is as follows:

  ```html
  {{#each iterable}} ... {{/each}}
  ```

- **Conditional Block:**
  You can render a block conditionally using the [if](https://docs.novu.co/platform/templates#conditional) keyword. The block is defined similar to the iteration block:

  ```html
  {{#if condition}} ... {{/if}}
  ```

For an in-depth explanation with examples, check out [Templates](https://docs.novu.co/platform/templates#messages).

</details>

<details>
<summary>Is creating and switching to a new organization deactivates the other organizations?</summary>

No, switching organization will only switch organization in UI, from API side all organizations are still active. Each organization has different api keys, subscribers and notification templates. Notification template of one organization can not be used with other organization's subscriber.

</details>

<details>
<summary>Is is possible to have multiple active providers per channel</summary>

Multiple active providers are only supported in [push](../channels/push) and [chat](../channels/chat) channels.

</details>
<details>
<summary>Does Novu have expiration dates for records? (TTL)</summary>

For Novu cloud users - notifications and activity feed data will be saved for 1 month.
In-app messages will be saved for 6 months.
After that time - the records will be archived.

For self-hosted - the same time frame applies before records will be deleted. A TTL expiration date will be set for them.  
Self-hosted users can disable ttl setting by adding environment variable `DISABLE_TTL=true`.

Affected schemes:

- Notification (1 month)
- Job (1 month)
- Message (in app - 6 months, all others - 1 month)
- ExecutionDetails (1 month)

</details>
