---
sidebar_position: 1
---

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

<details>
    <summary>API Backend</summary>
    <div>
      <ul>
        <li><code>NODE_ENV</code> (default: local)<br />The environment of the app. Possible values are: dev, test, prod, ci, local</li>
        <li><code>S3_LOCAL_STACK</code><br />The AWS endpoint for the S3 Bucket required for storing various media</li>
        <li><code>S3_BUCKET_NAME</code><br />The name of the S3 Bucket</li>
        <li><code>S3_REGION</code><br />The AWS region of the S3 Bucket</li>
        <li><code>PORT</code><br />The port on which the API backend should listen on</li>
        <li><code>FRONT_BASE_URL</code><br />The base url on which your frontend is accessible for the user. (e.g. web.novu.co)</li>
        <li><code>DISABLE_USER_REGISTRATION</code> (default: false)<br />If users should not be able to create new accounts. Possible values are: true, false</li>
        <li><code>REDIS_HOST</code><br />The domain / IP of your redis instance</li>
        <li><code>REDIS_PORT</code><br />The port of your redis instance</li>
        <li><code>REDIS_PASSWORD</code><br />Optional password of your redis instance</li>
        <li><code>REDIS_DB_INDEX</code><br />The Redis database index</li>
        <li><code>REDIS_CACHE_SERVICE_HOST</code><br />The domain / IP of your redis instance for caching</li>
        <li><code>REDIS_CACHE_SERVICE_PORT</code><br />The port of your redis instance for caching</li>
        <li><code>REDIS_DB_INDEX</code><br />The Redis cache database index</li>
        <li><code>REDIS_CACHE_TTL</code><br />The Redis cache ttl</li>
        <li><code>REDIS_CACHE_PASSWORD</code><br />The Redis cache password</li>
        <li><code>REDIS_CACHE_CONNECTION_TIMEOUT</code><br />The Redis cache connection timeout</li>
        <li><code>REDIS_CACHE_KEEP_ALIVE</code><br />The Redis cache TCP keep alive on the socket timeout</li>
        <li><code>REDIS_CACHE_FAMILY</code><br />The Redis cache IP stack version</li>
        <li><code>REDIS_CACHE_KEY_PREFIX</code><br />The Redis cache prefix prepend to all keys</li>
        <li><code>REDIS_CACHE_SERVICE_TLS</code><br />The Redis cache TLS connection support</li>
        <li><code>IN_MEMORY_CLUSTER_MODE_ENABLED</code><br />The flag that enables the cluster mode. It might be Redis or ElastiCache cluster, depending on the env variables set for either service.</li>
        <li><code>ELASTICACHE_CLUSTER_SERVICE_HOST</code><br />ElastiCache cluster host</li>
        <li><code>ELASTICACHE_CLUSTER_SERVICE_PORT</code><br />ElastiCache cluster port</li>
        <li><code>REDIS_CLUSTER_SERVICE_HOST</code><br />Redis cluster host</li>
        <li><code>REDIS_CLUSTER_SERVICE_PORTS</code><br />Redis cluster ports</li>
        <li><code>REDIS_CLUSTER_DB_INDEX</code><br />Redis cluster database index</li>
        <li><code>REDIS_CLUSTER_TTL</code><br />Redis cluster ttl</li>
        <li><code>REDIS_CLUSTER_PASSWORD</code><br />Redis cluster password</li>
        <li><code>REDIS_CLUSTER_CONNECTION_TIMEOUT</code><br />Redis cluster connection timeout</li>
        <li><code>REDIS_CLUSTER_KEEP_ALIVE</code><br />Redis cluster TCP keep alive on the socket timeout</li>
        <li><code>REDIS_CLUSTER_FAMILY</code><br />Redis cluster IP stack version</li>
        <li><code>REDIS_CLUSTER_KEY_PREFIX</code><br />Redis cluster prefix prepend to all keys</li>
        <li><code>JWT_SECRET</code><br />The secret keybase which is used to encrypt / verify the tokens issued for authentication</li>
        <li><code>SENDGRID_API_KEY</code><br />The api key of the Sendgrid account used to send various emails</li>
        <li><code>MONGO_URL</code><br />The URL of your MongoDB instance</li>
        <li><code>NOVU_API_KEY</code><br />The api key of web.novu.co used to send various emails</li>
        <li><code>SENTRY_DSN</code><br />The DSN of sentry.io used to report errors happening in production</li>
      </ul>
    </div>
</details>

<details>
    <summary>Worker</summary>
    <div>
      <ul>
        <li><code>NODE_ENV</code> (default: local)<br />The environment of the app. Possible values are: dev, test, prod, ci, local</li>
        <li><code>PORT</code><br />The port on which the Worker app should listen on</li>
        <li><code>STORE_ENCRYPTION_KEY</code><br />The encryption key used to encrypt/decrypt provider credentials</li>
        <li><code>MAX_NOVU_INTEGRATION_MAIL_REQUESTS</code><br />The number of free emails that can be sent with the Novu email provider</li>
        <li><code>NOVU_EMAIL_INTEGRATION_API_KEY</code><br />The Novu email provider Sentry API key</li>
        <li><code>STORAGE_SERVICE</code><br />The storage service name: AWS, GCS, or AZURE</li>
        <li><code>S3_LOCAL_STACK</code><br />The LocalStack service URL</li>
        <li><code>S3_BUCKET_NAME</code><br />The name of the S3 Bucket</li>
        <li><code>S3_REGION</code><br />The AWS region of the S3 Bucket</li>
        <li><code>GCS_BUCKET_NAME</code><br />The name of the GCS Bucket</li>
        <li><code>AZURE_ACCOUNT_NAME</code><br />The name of the Azure account</li>
        <li><code>AZURE_ACCOUNT_KEY</code><br />The Azure account key</li>
        <li><code>AZURE_HOST_NAME</code><br />The Azure host name</li>
        <li><code>AZURE_CONTAINER_NAME</code><br />The Azure container name</li>
        <li><code>AWS_ACCESS_KEY_ID</code><br />The AWS access key</li>
        <li><code>AWS_SECRET_ACCESS_KEY</code><br />The AWS secret access key</li>
        <li><code>REDIS_HOST</code><br />The domain / IP of your redis instance</li>
        <li><code>REDIS_PORT</code><br />The port of your redis instance</li>
        <li><code>REDIS_PASSWORD</code><br />Optional password of your redis instance</li>
        <li><code>REDIS_DB_INDEX</code><br />The Redis database index</li>
        <li><code>REDIS_CACHE_SERVICE_HOST</code><br />The domain / IP of your redis instance for caching</li>
        <li><code>REDIS_CACHE_SERVICE_PORT</code><br />The port of your redis instance for caching</li>
        <li><code>REDIS_DB_INDEX</code><br />The Redis cache database index</li>
        <li><code>REDIS_CACHE_TTL</code><br />The Redis cache ttl</li>
        <li><code>REDIS_CACHE_PASSWORD</code><br />The Redis cache password</li>
        <li><code>REDIS_CACHE_CONNECTION_TIMEOUT</code><br />The Redis cache connection timeout</li>
        <li><code>REDIS_CACHE_KEEP_ALIVE</code><br />The Redis cache TCP keep alive on the socket timeout</li>
        <li><code>REDIS_CACHE_FAMILY</code><br />The Redis cache IP stack version</li>
        <li><code>REDIS_CACHE_KEY_PREFIX</code><br />The Redis cache prefix prepend to all keys</li>
        <li><code>REDIS_CACHE_SERVICE_TLS</code><br />The Redis cache TLS connection support</li>
        <li><code>IN_MEMORY_CLUSTER_MODE_ENABLED</code><br />The flag that enables the cluster mode. It might be Redis or ElastiCache cluster, depending on the env variables set for either service.</li>
        <li><code>ELASTICACHE_CLUSTER_SERVICE_HOST</code><br />ElastiCache cluster host</li>
        <li><code>ELASTICACHE_CLUSTER_SERVICE_PORT</code><br />ElastiCache cluster port</li>
        <li><code>REDIS_CLUSTER_SERVICE_HOST</code><br />Redis cluster host</li>
        <li><code>REDIS_CLUSTER_SERVICE_PORTS</code><br />Redis cluster ports</li>
        <li><code>REDIS_CLUSTER_DB_INDEX</code><br />Redis cluster database index</li>
        <li><code>REDIS_CLUSTER_TTL</code><br />Redis cluster ttl</li>
        <li><code>REDIS_CLUSTER_PASSWORD</code><br />Redis cluster password</li>
        <li><code>REDIS_CLUSTER_CONNECTION_TIMEOUT</code><br />Redis cluster connection timeout</li>
        <li><code>REDIS_CLUSTER_KEEP_ALIVE</code><br />Redis cluster TCP keep alive on the socket timeout</li>
        <li><code>REDIS_CLUSTER_FAMILY</code><br />Redis cluster IP stack version</li>
        <li><code>REDIS_CLUSTER_KEY_PREFIX</code><br />Redis cluster prefix prepend to all keys</li>
        <li><code>MONGO_URL</code><br />The URL of your MongoDB instance</li>
        <li><code>NEW_RELIC_APP_NAME</code><br />The New Relic app name</li>
        <li><code>NEW_RELIC_LICENSE_KEY</code><br />The New Relic license key</li>
        <li><code>SEGMENT_TOKEN</code><br />The Segment Analytics token</li>
      </ul>
    </div>
</details>

<details>
    <summary>Web client</summary>
    <div>
      <ul>
        <li><code>REACT_APP_ENVIRONMENT</code> <br />The environment of the app. Possible values are: dev, test, prod, ci, local</li>
        <li><code>REACT_APP_API_URL</code> <br />The base url on which your API backend would be accessible</li>
        <li><code>REACT_APP_WS_URL</code> <br />The base url on which your WebSocket service would be accessible</li>
        <li><code>SKIP_PREFLIGHT_CHECK</code> (default: true)<br />Solves a problem with React App dependency tree.</li>
      </ul>
    </div>

:::warning

When configuring different than default values for the API and WebSocket URLs, in order for the Web app to apply the changes done to the `./env` file, it is needed to run the script `pnpm envsetup`.
This will generate a file called `env-config.js` that will be copied inside of the `public` folder of the application. Its purpose is to inject in the `window._env_` object the chosen environment variables that manage the URLs the Web client will call to access to the API backend and the WebSocket service.

:::

</details>

<details>
    <summary>WebSocket Service</summary>
    <div>
      <ul>
        <li><code>NODE_ENV</code> (default: local)<br />The environment of the app. Possible values are: dev, test, prod, ci, local</li>
        <li><code>SENTRY_DSN</code><br />The DSN of sentry.io used to report errors happening in production</li>
        <li><code>REDIS_HOST</code><br />The domain / IP of your redis instance</li>
        <li><code>REDIS_PORT</code><br />The port of your redis instance</li>
        <li><code>REDIS_DB_INDEX</code><br />The database index of your redis instance</li>
        <li><code>REDIS_PASSWORD</code><br />Optional password of your redis instance</li>
        <li><code>JWT_SECRET</code><br />The secret keybase which is used to encrypt / verify the tokens issued for authentication</li>
        <li><code>MONGO_URL</code><br />The URL of your MongoDB instance</li>
        <li><code>PORT</code><br />The port on which the WebSocket service should listen on</li>
      </ul>
    </div>
</details>

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
