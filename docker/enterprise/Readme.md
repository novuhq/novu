# Novu Enterprise: On-Premises Non-Production Trial with Docker Compose

This documentation guides you through the process of setting up an on-premises trial of Novu Enterprise using Docker Compose.

To do this trail you will need to contact [sales](https://notify.novu.co/meetings/ryannovu/30minutes) to get a token.



Note: This is not our preferred way of doing an enterprise trail,
all features are available on Novu Cloud with a free trial.

## Before You Begin

Ensure that the following software has been installed on your system:

- [Docker](https://docs.docker.com/engine/install/) and [docker-compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/downloads)

## Guide

### Get the Code

Warning: Before you start this process, If you have an existing mongodb volume you will need to remove it to 
ensure the enterprise tables are installed correctly.

Clone the Novu repository and navigate to the Docker directory:

```sh
# Add the token to the shell env
GH_TOKEN=ghr_xxxx

# Get the code
git clone https://github.com/novuhq/novu

# Go to the docker folder
cd novu/docker

# Copy the example env file
cp .env.example ./enterprise/.env

# Login
echo "$GH_TOKEN" | docker login --username cliftonz --password-stdin

# Start Novu
docker-compose -f ./enterprise/docker-compose.enterprise.yml up
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
