---
sidebar_position: 1
---

# Run Novu locally

## Requirements

- Node.js version v14.19.3
- MongoDB
- Redis
- **(Optional)** pnpm - Needed if you want to install new packages
- **(Optional)** localstack (required only in S3 related modules)
Need help installing the requirments? Read more [here](https://www.notion.so/novuhq/Dev-Machine-Setup-98d274c80fa249b0b0be75b9a7a72acb#a0e6bf0db22f46d8a2677692f986e366)

## Setup the project

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

## Running tests

After making some changes, you can run the tests for the different package using the appropriate CLI commands.

### API

To run the api tests you can simply run the following command:

```shell
npm run start:e2e:api
```

The test will run a new instance of Novu against the test db and run the tests against it. The test db will be removed after tests has finished running.

### Web

To run the front end tests for the web project using cypress you will need to install localstack in order for all the tests to pass.
Run the tests using:

```shell
cd apps/web && npm run cypress:run
```

To open the cypress management windows to debug tests run:

```shell
cd apps/web && npm run cypress:open
```

### Different ports used by the services the projects spins up

- **3000** - API
- **3002** - WebSocket service
- **4200** - Web Management UI
- **4500** - Iframe embed for notification center

### Testing providers

To run tests against the providers folder you can use the "npm run test:providers" command.
