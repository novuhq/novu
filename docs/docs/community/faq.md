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

| | Keywords | Usage |
|-|-|-|
| [Custom Variables](https://docs.novu.co/platform/templates#variable-usage) | `{{variable_name}}` | Accessing the value of a variable |
| [Iteration/Looping](https://docs.novu.co/platform/templates#iteration) | `{{#each iterable}} ... {{/each}}` | Iterating through a list of variables |
| [Conditional Block](https://docs.novu.co/platform/templates#conditional) | `{{#if condition}} ... {{/if}}` | Rendering a block conditionally |

For an in-depth explanation with examples, check out [Templates](https://docs.novu.co/platform/templates#messages).
