---
sidebar_position: 1
---

import FAQ from '@site/src/components/FAQ';
import FAQItem from '@site/src/components/FAQItem';

# Run Novu locally

## ⚡ Immediate working space with Gitpod

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/novuhq/novu)

## Requirements

- Node.js version v16.15.1
- MongoDB
- Redis
- **(Optional)** pnpm - Needed if you want to install new packages
- **(Optional)** localstack (required only in S3 related modules)

Need help installing the requirements? Read more [here](https://novuhq.notion.site/Dev-Machine-Setup-98d274c80fa249b0b0be75b9a7a72acb#a0e6bf0db22f46d8a2677692f986e366).

## Setup the project

After installing the required services on your machine, you can clone and set up your forked version of the project:

- Fork [Novu's repository](https://github.com/novuhq/novu). Clone or download your fork to your local machine.
- Run the project locally using `npm run start`.

The `npm run start` will start the Jarvis CLI tool which allows you to run the whole project with an ease.
If you only want to run parts of the platform, you can use the following run commands from the root project:

- **start:dev** - Synonym to `npm run start`
- **start:web** - Only starts the web management platform
- **start:ws** - Only starts the WebSocket service for notification center updates
- **start:widget** - Starts the widget wrapper project that hosts the notification center inside an iframe
- **start:api** - Runs the API in watch mode
- **start:worker** - Runs the worker application in watch mode
- **start:dal** - Runs the Data Access Layer package in watch mode
- **start:shared** - Starts the watch mode for the shared client and API library
- **start:node** - Runs the `@novu/node` package in watch mode
- **start:notification-center** - Runs and builds the React package for the Novu notification center

## Set up your environment variables

If you have used Jarvis CLI tool from the previous step you don't need to setup the env variables as Jarvis will do that on the first run if setup wasn't done before.

The command `npm run setup:project` creates default environment variables that are required to run Novu in a development environment.
However, if you want to test certain parts of Novu or run it in production mode, you need to change some of them. These are all the available environment variables:

<FAQ>
<FAQItem title="API Backend">

- `NODE_ENV` (default: local)<br />The environment of the app. Possible values are: dev, test, production, ci, local
- `S3_LOCAL_STACK`<br />The AWS endpoint for the S3 Bucket required for storing various media
- `S3_BUCKET_NAME`<br />The name of the S3 Bucket
- `S3_REGION`<br />The AWS region of the S3 Bucket
- `PORT`<br />The port on which the API backend should listen on
- `FRONT_BASE_URL`<br />The base url on which your frontend is accessible for the user. (e.g. web.novu.co)
- `DISABLE_USER_REGISTRATION` (default: false)<br />If users should not be able to create new accounts. Possible values are: true, false
- `REDIS_HOST`<br />The domain / IP of your redis instance
- `REDIS_PORT`<br />The port of your redis instance
- `REDIS_PASSWORD`<br />Optional password of your redis instance
- `REDIS_DB_INDEX`<br />The Redis database index
- `REDIS_CACHE_SERVICE_HOST`<br />The domain / IP of your redis instance for caching
- `REDIS_CACHE_SERVICE_PORT`<br />The port of your redis instance for caching
- `REDIS_CACHE_DB_INDEX`<br />The Redis cache database index
- `REDIS_CACHE_TTL`<br />The Redis cache ttl
- `REDIS_CACHE_PASSWORD`<br />The Redis cache password
- `REDIS_CACHE_CONNECTION_TIMEOUT`<br />The Redis cache connection timeout
- `REDIS_CACHE_KEEP_ALIVE`<br />The Redis cache TCP keep alive on the socket timeout
- `REDIS_CACHE_FAMILY`<br />The Redis cache IP stack version
- `REDIS_CACHE_KEY_PREFIX`<br />The Redis cache prefix prepend to all keys
- `REDIS_CACHE_SERVICE_TLS`<br />The Redis cache TLS connection support
- `IS_IN_MEMORY_CLUSTER_MODE_ENABLED`<br />The flag that enables the cluster mode. It might be Redis or ElastiCache cluster, depending on the env variables set for either service.
- `ELASTICACHE_CLUSTER_SERVICE_HOST`<br />ElastiCache cluster host
- `ELASTICACHE_CLUSTER_SERVICE_PORT`<br />ElastiCache cluster port
- `REDIS_CLUSTER_SERVICE_HOST`<br />Redis cluster host
- `REDIS_CLUSTER_SERVICE_PORTS`<br />Redis cluster ports
- `REDIS_CLUSTER_DB_INDEX`<br />Redis cluster database index
- `REDIS_CLUSTER_TTL`<br />Redis cluster ttl
- `REDIS_CLUSTER_PASSWORD`<br />Redis cluster password
- `REDIS_CLUSTER_CONNECTION_TIMEOUT`<br />Redis cluster connection timeout
- `REDIS_CLUSTER_KEEP_ALIVE`<br />Redis cluster TCP keep alive on the socket timeout
- `REDIS_CLUSTER_FAMILY`<br />Redis cluster IP stack version
- `REDIS_CLUSTER_KEY_PREFIX`<br />Redis cluster prefix prepend to all keys
- `JWT_SECRET`<br />The secret keybase which is used to encrypt / verify the tokens issued for authentication
- `SENDGRID_API_KEY`<br />The api key of the Sendgrid account used to send various emails
- `MONGO_URL`<br />The URL of your MongoDB instance
- `MONGO_MAX_POOL_SIZE`<br />The max pool size of the MongoDB connection
- `NOVU_API_KEY`<br />The api key of web.novu.co used to send various emails
- `SENTRY_DSN`<br />The DSN of sentry.io used to report errors happening in production

</FAQItem>
<FAQItem title="Worker">

- `NODE_ENV` (default: local)<br />The environment of the app. Possible values are: dev, test, production, ci, local
- `PORT`<br />The port on which the Worker app should listen on
- `STORE_ENCRYPTION_KEY`<br />The encryption key used to encrypt/decrypt provider credentials
- `MAX_NOVU_INTEGRATION_MAIL_REQUESTS`<br />The number of free emails that can be sent with the Novu email provider
- `NOVU_EMAIL_INTEGRATION_API_KEY`<br />The Novu email provider Sentry API key
- `STORAGE_SERVICE`<br />The storage service name: AWS, GCS, or AZURE
- `S3_LOCAL_STACK`<br />The LocalStack service URL
- `S3_BUCKET_NAME`<br />The name of the S3 Bucket
- `S3_REGION`<br />The AWS region of the S3 Bucket
- `GCS_BUCKET_NAME`<br />The name of the GCS Bucket
- `AZURE_ACCOUNT_NAME`<br />The name of the Azure account
- `AZURE_ACCOUNT_KEY`<br />The Azure account key
- `AZURE_HOST_NAME`<br />The Azure host name
- `AZURE_CONTAINER_NAME`<br />The Azure container name
- `AWS_ACCESS_KEY_ID`<br />The AWS access key
- `AWS_SECRET_ACCESS_KEY`<br />The AWS secret access key
- `REDIS_HOST`<br />The domain / IP of your redis instance
- `REDIS_PORT`<br />The port of your redis instance
- `REDIS_PASSWORD`<br />Optional password of your redis instance
- `REDIS_DB_INDEX`<br />The Redis database index
- `REDIS_CACHE_SERVICE_HOST`<br />The domain / IP of your redis instance for caching
- `REDIS_CACHE_SERVICE_PORT`<br />The port of your redis instance for caching
- `REDIS_DB_INDEX`<br />The Redis cache database index
- `REDIS_CACHE_TTL`<br />The Redis cache ttl
- `REDIS_CACHE_PASSWORD`<br />The Redis cache password
- `REDIS_CACHE_CONNECTION_TIMEOUT`<br />The Redis cache connection timeout
- `REDIS_CACHE_KEEP_ALIVE`<br />The Redis cache TCP keep alive on the socket timeout
- `REDIS_CACHE_FAMILY`<br />The Redis cache IP stack version
- `REDIS_CACHE_KEY_PREFIX`<br />The Redis cache prefix prepend to all keys
- `REDIS_CACHE_SERVICE_TLS`<br />The Redis cache TLS connection support
- `IS_IN_MEMORY_CLUSTER_MODE_ENABLED`<br />The flag that enables the cluster mode. It might be Redis or ElastiCache cluster, depending on the env variables set for either service.
- `ELASTICACHE_CLUSTER_SERVICE_HOST`<br />ElastiCache cluster host
- `ELASTICACHE_CLUSTER_SERVICE_PORT`<br />ElastiCache cluster port
- `REDIS_CLUSTER_SERVICE_HOST`<br />Redis cluster host
- `REDIS_CLUSTER_SERVICE_PORTS`<br />Redis cluster ports
- `REDIS_CLUSTER_DB_INDEX`<br />Redis cluster database index
- `REDIS_CLUSTER_TTL`<br />Redis cluster ttl
- `REDIS_CLUSTER_PASSWORD`<br />Redis cluster password
- `REDIS_CLUSTER_CONNECTION_TIMEOUT`<br />Redis cluster connection timeout
- `REDIS_CLUSTER_KEEP_ALIVE`<br />Redis cluster TCP keep alive on the socket timeout
- `REDIS_CLUSTER_FAMILY`<br />Redis cluster IP stack version
- `REDIS_CLUSTER_KEY_PREFIX`<br />Redis cluster prefix prepend to all keys
- `MONGO_URL`<br />The URL of your MongoDB instance
- `MONGO_MAX_POOL_SIZE`<br />The max pool size of the MongoDB connection
- `NEW_RELIC_APP_NAME`<br />The New Relic app name
- `NEW_RELIC_LICENSE_KEY`<br />The New Relic license key
- `SEGMENT_TOKEN`<br />The Segment Analytics token

</FAQItem>
<FAQItem title="Web client">

- `REACT_APP_ENVIRONMENT` <br />The environment of the app. Possible values are: dev, test, production, ci, local
- `REACT_APP_API_URL` <br />The base url on which your API backend would be accessible
- `REACT_APP_WS_URL` <br />The base url on which your WebSocket service would be accessible
- `SKIP_PREFLIGHT_CHECK` (default: true)<br />Solves a problem with React App dependency tree.

:::warning

When configuring different than default values for the API and WebSocket URLs, in order for the Web app to apply the changes done to the `./env` file, it is needed to run the script `pnpm envsetup`.
This will generate a file called `env-config.js` that will be copied inside of the `public` folder of the application. Its purpose is to inject in the `window._env_` object the chosen environment variables that manage the URLs the Web client will call to access to the API backend and the WebSocket service.

:::

</FAQItem>
<FAQItem title="Worker">

- `NODE_ENV` (default: local)<br />The environment of the app. Possible values are: dev, test, production, ci, local
- `SENTRY_DSN`<br />The DSN of sentry.io used to report errors happening in production
- `REDIS_HOST`<br />The domain / IP of your redis instance
- `REDIS_PORT`<br />The port of your redis instance
- `REDIS_DB_INDEX`<br />The database index of your redis instance
- `REDIS_PASSWORD`<br />Optional password of your redis instance
- `JWT_SECRET`<br />The secret keybase which is used to encrypt / verify the tokens issued for authentication
- `MONGO_URL`<br />The URL of your MongoDB instance
- `MONGO_MAX_POOL_SIZE`<br />The max pool size of the MongoDB connection
- `PORT`<br />The port on which the WebSocket service should listen on

</FAQItem>
</FAQ>

## Running tests

After making changes, you can run the tests for the respective package using the appropriate CLI commands:

### API

To run the API tests, run the following command:

```shell
npm run start:worker:test
npm run start:e2e:api
```

The tests create a new instance of Novu and a test db and run the tests against it. The test db is removed after all tests have finished running.

### Web

To run the front end tests for the web project using cypress you need to install localstack.
The cypress tests perform E2E tests. To be able to perform E2E tests, you need to run the API service in the appropriate test environment.

Run the services in test env with the following commands:

```shell
npm run start:web
npm run start:api:test
npm run start:worker:test
npm run start:ws:test
```

Run the cypress test suite with the following command:

```shell
cd apps/web && npm run cypress:run
```

To open the cypress management window to debug tests, run the following commands:

```shell
cd apps/web && npm run cypress:open
```

### Different ports used by the services the project spins up

- **3000** - API
- **3002** - WebSocket Service
- **3004** - Worker application
- **4200** - Web Management UI
- **4701** - Iframe embed for notification center
- **4500** - Widget Service

### Testing providers

To run tests against the providers folder, you can use the `npm run test:providers` command.

### Local environment setup script (beta)

As an option in our script runner `Jarvis` we have made available an option to run [this script](https://github.com/novuhq/novu/blob/2f2abdcaaad8a7735e0a2d488607c3276c8975fd/scripts/dev-environment-setup.sh) that will automatically try to install all the dependencies needed to be able to run Novu locally, as previous step of installing the project dependencies through `pnpm install`.
When executing it inside `Jarvis`, you will need to have previously installed by yourself `git` and `node`, as we mentioned earlier on this page.

The script can be run on its own without any previously dependency installed, as it is prepared to execute the following tasks:

- Check of the running OS in the local machine (currently only MacOSx and [GNU Linux](https://en.wikipedia.org/wiki/GNU/Linux_naming_controversy) supported)
- Install of OS dependencies (currently only MacOSx supported)
  -- MacOSx: It will execute the following tasks
  --- Will try to install or update [XCode](https://developer.apple.com/xcode/) (skippable step; though XCode installs [`git`](https://git-scm.com/) that is a required dependency for later)
  --- Will install [Rosetta](https://support.apple.com/en-gb/HT211861) for Apple CPUs
  --- Will set up some opinionated OS settings
- Will check if [`git`](https://git-scm.com/) is installed and if not will abort operation
- Will make [ZSH](https://en.wikipedia.org/wiki/Z_shell) as the default shell to be able to execute the next task
- Will (opinionatedly) install [Oh My Zsh!](https://ohmyz.sh/) (skippable task)
- Will (opinionatedly) install the [Homebrew](https://brew.sh/) package manager and will set up your local environment to execute it besides adding some casks
- Will (opinionatedly) install [NVM](https://github.com/nvm-sh/nvm) as Node.js version manager
- Will install the required [Node.js](https://nodejs.org/en/) version to be able to [run Novu](https://github.com/novuhq/novu/blob/2f2abdcaaad8a7735e0a2d488607c3276c8975fd/package.json#L180)
- Will install [PNPM](https://pnpm.io/) as package manager, required dependency for some of the tasks inside Novu's scripts
- Will install [Docker](https://www.docker.com/) as containerized application development tool
- Will install required databases [MongoDB](https://www.mongodb.com/) (Community version) and [Redis](https://redis.io/) through Homebrew
- Will install the [AWS CLI](https://aws.amazon.com/cli/) tool (not required to run Novu; it is a core maintainers used tool)
- Will create a local development domain `local.novu.co` in your local machine
- Will clone Novu repository in your local machine (skippable step) to a selected folder `$HOME/Dev`

:::warning

This script has only been thoroughly tested in MacOSx. Little testing has been run in GNU Linux.

:::

:::info
This script is not bullet-proof and some of the tasks have intertwined dependencies with each other. We have tried to make it as idempotent as possible but some loose knots will probably show or because conflicts between versions of the different dependencies.
Please report to us any problem found and we will try to fix or assist though we have not the resources to make it idempotent in every potential system and potential combinations.

:::
