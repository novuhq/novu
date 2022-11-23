
## Before you begin

You need the following installed in your system:

- [Docker](https://docs.docker.com/engine/install/) and docker-compose
- [Git](https://git-scm.com/downloads)

## Quick Start

### Get the code 

Clone the Novu repo and enter the docker directory locally:

```sh
# Get the code
git clone https://github.com/novuhq/novu

# Go to the docker folder
cd novu/docker/local

# Copy the example env file to a solid in the local repository
cp ../.env.example .env
```

### Update Secrets

Update the `.env` file with your own secrets. In particular, these are required:

- `JWT_SECRET`: used by the API to generate JWT keys


### Start local infrastructure

To start the local infrastructure run the following: 
```sh
docker-compose -f ./development/docker-compose.yml up
```

This will spin up redis, mongo, and local-stacks in your local docker. 

### Start the Novu Services 

If you need to start all the Novu services start the Novu run the following:
```sh
docker-compose -f ./development/docker-compose.development.yml up
```

Now visit [http://localhost:4200](http://localhost:4200) to start developing Novu.

## Next steps

- Got a question? [Ask here](https://github.com/novuhq/novu/discussions).
