# Contributing to Novu

Your interest in contributing is much appreciated. 
Thank you for showing an interest in contributing to Novu! Novu is an open source project, . 

- [I have a question](#questions-and-suggestions)
- [Ways to contribute](#ways-to-contribute)
- [Missing Provider](#missing-a-provider?)
- [Coding Rules](#coding-rules)

## Questions and suggestions

Questions, suggestions and thoughts are most welcome. Feel free to open a [Github Discussion](https://github.com/novuhq/novu/discussions). We can also be reached in our [Discord Channel](https://discord.gg/heTZ9zJd).

## Ways to contribute

- **Try our [providers](https://github.com/novuhq/novu/tree/main/providers) and give feedback** 
- Add new providers
- **issues**
- **Share your thoughts and suggestions with us** -
- Request a feature 
- Report a bug
- **Improve documentation** - fix incomplete or missing [docs](https://docs.novu.co/), bad wording, examples or explanations.


## Missing a provider? 

If you are in need of a provider we do not yet have, you can request a new one by [submitting an issue](#submitting-an-issue). Or you can build a new one by following our [create a provider guide](https://docs.novu.co/docs/community/create-provider).

## Submitting an issue

Before submitting a new issue, please search the issues and discussion tabs maybe an issue or discussion already exists and might inform you of workarounds, or you can give new information.

While we want to fix all the issues, before fixing a bug we need to be able to reproduce and confirm it. Please provide us with a minimal reproduction scenario using a repository or [Gist](https://gist.github.com/). Having a live, reproducible scenario gives us the information without asking questions back & forth with additional questions like:

- 3rd-party libraries and their versions, mainly providers, but not exclusively
- a use-case that fails

Without said minimal reproduction, we won't be able to investigate all issues, and the issue might not be resolved.

You can open a new issues with this new [issue form](https://github.com/novuhq/novu/issues/new).

# Missing a Feature?

If a feature is missing you can _request_ a new one by [submitting an issue](#submitting-an-issue) to our GitHub Repository. 
If you would like to _implement_ it, an issue with your proposal must be submitted first, to be sure that we can use it. Please consider:


# Get started with Novu locally 

- Fork [Novu's repository](https://github.com/novuhq/novu) or any of our providers. Clone or download your fork.
- Run initial setup command `npm run setup:project`
- To run all 
```bash
npm run setup:project
npm run start
```

## Common scripts

- `npm run setup:project` - initial setup
- `npm run start` - 

### Testing scripts
Make sure to add tests to any changes you have made and then run the appropriate test suit.
From root folder, run:
- `npm run start:e2e:api` - e2e tests for api 
- `cd apps/web && npm run cypress:run` - cypress tests for web
- `npm run test:providers` - test providers


## Submitting a Pull Request (PR)

1. 






## Coding rules

To ensure consistency throughout the source code, keep these rules in mind as you are working:
- All features or bug fixes must be tested by one or more specs (unit-tests).
- We use [Eslint default rule guide](https://eslint.org/docs/rules/), with minor changes. An automated formatter is available (npm run format).
