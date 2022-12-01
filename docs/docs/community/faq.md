# FAQ

Here we will outline some of the most common questions we get asked about the project. Missing a question? Feel free to open an [issue](https://github.com/novuhq/novu/issues) or PR to add it to the list.

## What are the dependencies required to run Novu?

Novu consists of multiple services written in Node.js and Typescript. The following are the dependencies required to run the project fully:

- Node.js version v16.15.1
- MongoDB
- Redis
- File storage (S3/GCP/Azure) - Optional

## How do I customize messages on Novu?

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
