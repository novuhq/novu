# Contributing to Novu

Thank you for showing an interest in contributing to Novu! All kinds of contribution are valuable to us. In this guide we will cover how you can quickly onboard and make your first contribution.

## Submitting an issue

Before submitting a new issue, please search the issues and discussion tabs maybe an issue or discussion already exists and might inform you of workarounds, or you can give new information.

While we want to fix all the issues, before fixing a bug we need to be able to reproduce and confirm it. Please provide us with a minimal reproduction scenario using a repository or [Gist](https://gist.github.com/). Having a live, reproducible scenario gives us the information without asking questions back & forth with additional questions like:

- 3rd-party libraries and their versions, mainly providers, but not exclusively
- a use-case that fails

Without said minimal reproduction, we won't be able to investigate all issues, and the issue might not be resolved.

You can open a new issues with this new [issue form](https://github.com/novuhq/novu/issues/new).

## Projects structure and Architecture
### The Novu Architecture
![https://user-images.githubusercontent.com/8872447/168135722-2643eac4-8fcd-4de6-909b-02118faa1dc8.jpeg](https://user-images.githubusercontent.com/8872447/168135722-2643eac4-8fcd-4de6-909b-02118faa1dc8.jpeg)
To learn more about the novu mental mode visit our documentation site on this [link](https://docs.novu.co/docs/overview/architecture).

### Project Structure
Novu uses a monorepo approach to manage our multiple packages and their associated code.

![Mono-repo Structure (3)](https://user-images.githubusercontent.com/8872447/172360367-6c60d365-c77a-49bb-a2f2-85f9d7f4ddf2.jpeg)

Read more about our monorepo structure [here](https://novuhq.notion.site/Monorepo-structure-b34ab7edac334e6f9a5fe457cae3c530).

## Run Novu locally
### Requirements
- Node.js version v14.19.3
- MongoDB
- Redis
- **(Optional)** pnpm v6 - Needed if you want to install new packages
- **(Optional)** localstack (required only in S3 related mopdules)
Need help installing the requirments? Read more [here](https://www.notion.so/novuhq/Dev-Machine-Setup-98d274c80fa249b0b0be75b9a7a72acb#a0e6bf0db22f46d8a2677692f986e366)

### Setup the project
After installing the required services on your machine you can clone and setup your forked version of the project. 

- Fork [Novu's repository](https://github.com/novuhq/novu). Clone or download your fork to your local machine.
- Run initial setup command `npm run setup:project` to install and build all dependencies
- Run the project locally using: `npm run start`

The `npm run start` will start all of the services in parallel including the API's and web clients.
If you only want to run parts of the platform, you can use the following run commands from the root project:

- **start:dev** - Synonym to `npm run start`
- **start:web** - Only starts the web management platform
- **start:ws** - Only starts the WebSocket service for notification center updates
- **start:widget** - Starts the widget wrapper project that hosts the notification center inside an iframe
- **start:api** - Run the API in watch mode
- **start:dal** - Run the Data Access Layer package in watch mode
- **start:shared** - Starts the watch mode for the shared client and API library
- **start:node** - Runs the `@novu/node` package in watch mode
- **start:notification-center** - Runs and build the React package for the Novu notification center

### Running tests

After making some changes, you can run the tests for the different package using the appropriate CLI commands.

#### API
To run the api tests you can simply run the following command:
```shell
npm run start:e2e:api
```
The test will run a new instance of Novu against the test db and run the tests against it. The test db will be removed after tests has finished running.

#### Web
To run the front end tests for the web project using cypress you will need to install localstack in order for all the tests to pass.
Run the tests using: 
```shell
cd apps/web && npm run cypress:run
```

To open the cypress management windows to debug tests run: 
```shell
cd apps/web && npm run cypress:open
```

#### Different ports used by the services the projects spins up

- 3000 - API

- 3002 - WebSocket service

- 4200 - Web Management UI

- 4500 - Iframe embed for notification center

#### Testing providers
To run tests against the providers folder you can use the "npm run test:providers" command. 

## Missing a Feature?

If a feature is missing you can _request_ a new one by [submitting an issue](#submitting-an-issue) to our GitHub Repository.
If you would like to _implement_ it, an issue with your proposal must be submitted first, to be sure that we can use it. Please consider:


## Coding guides

To ensure consistency throughout the source code, keep these rules in mind as you are working:
- All features or bug fixes must be tested by one or more specs (unit-tests).
- We use [Eslint default rule guide](https://eslint.org/docs/rules/), with minor changes. An automated formatter is available using prettier.

## Need help? Questions and suggestions

Questions, suggestions and thoughts are most welcome. Feel free to open a [Github Discussion](https://github.com/novuhq/novu/discussions). We can also be reached in our [Discord Channel](https://discord.gg/heTZ9zJd).

## Ways to contribute

- Try the Novu API and platform and give feedback
- Add new providers
- Help with open issues
- Share your thoughts and suggestions with us
- Help create tutorials and blog posts
- Request a feature
- Report a bug
- **Improve documentation** - fix incomplete or missing [docs](https://docs.novu.co/), bad wording, examples or explanations.


## Missing a provider?

If you are in need of a provider we do not yet have, you can request a new one by [submitting an issue](#submitting-an-issue). Or you can build a new one by following our [create a provider guide](https://docs.novu.co/docs/community/create-provider).
