# Novu Enterprise Docker Compose

This documentation guides you through the process of setting up a non-production deployment of Novu Enterprise using Docker Compose.

You will need to contact [sales](https://notify.novu.co/meetings/ryannovu/30minutes) to get a token.

## Before You Begin

Ensure that the following software has been installed on your system:

- [Docker](https://docs.docker.com/engine/install/) and [docker-compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/downloads)

## Guide

### Get the Code

Warning: Before you start this process, If you have an existing mongodb volume you will need to remove it to 
ensure the enterprise tables are installed correctly.

Clone the Novu repository, navigate to this directory, and run the following command with the provided username and token

```sh
# Add the token to the shell env
NOVU_ENTERPRISE_TOKEN=ghp_xxxx

# Copy the example env file
cp .env.example .env

# Login
docker login ghcr.io --username <provided_username> --password "$NOVU_ENTERPRISE_TOKEN"

# Start Novu
docker-compose -f ./docker-compose.enterprise.yml up
```

Now visit [http://127.0.0.1:4200](http://127.0.0.1:4200) to start using Novu.

## Secure Your Setup
Though we provide some example secrets for getting started, it's highly recommended NOT to deploy your Novu setup using the defaults provided.
Update the .env file with your own secrets, in particular, make sure you replace:
JWT_SECRET: A secret key used by the API to generate JWT tokens.

## Redis Configuration
You can configure Redis TLS by adding the following variables to the .env file and specifying the needed properties:
REDIS_TLS={"servername":"localhost"}
REDIS_CACHE_SERVICE_TLS={"servername":"localhost"}

## Configuration
For simplicity, we made decisions that might not be optimal for production:
- The database is on the same machine as the servers.
- The storage uses the filesystem backend instead of S3.

We strongly advise decoupling your storage before deploying Novu in a production environment.
