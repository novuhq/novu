
Docker is the easiest way to get started with self-hosted Novu, 
however if you want to set up the system on docker for local development look [here](local/Readme.md)
or if you want to deploy Novu to Kubernetes check [here](kubernetes/Readme.md)

## Before you begin

You need the following installed in your system:

- [Docker](https://docs.docker.com/engine/install/) and [docker-compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/downloads)

## Quick Start

### Get the code

Clone the Novu repo and enter the docker directory locally:

```sh
# Get the code
git clone https://github.com/novuhq/novu

# Go to the docker folder
cd novu/docker

# Copy the example env file
cp .env.example ./local/deployment/.env

# Start Novu
docker-compose -f ./local/deployment/docker-compose.yml up
```

Now visit [http://localhost:4200](http://localhost:4200) to start using Novu.

### Securing your setup

While we provide you with some example secrets for getting started, you should NEVER deploy your Novu setup using the defaults provided.

### Update Secrets

Update the `.env` file with your own secrets. In particular, these are required:

- `JWT_SECRET`: used by the API to generate JWT keys

## Configuration

To keep the setup simple, we made some choices that may not be optimal for production:

- the database is in the same machine as the servers
- the storage uses the filesystem backend instead of S3

We strongly recommend that you decouple your database before deploying.

## Next steps

- Got a question? [Ask here](https://github.com/novuhq/novu/discussions).
