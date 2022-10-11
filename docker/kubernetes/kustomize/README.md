
# Kubernetes Deployment Files

## Build

How to build:

```bash
kustomize build .
```

## Deploy

How to deploy:

```bash
kustomize build . | kubectl apply -f - 
```

## Convert

These files have been genereated with the following command, having the `docker-compose.yaml` in the directory:

```bash
kompose convert
```

Then, the following modifications have been made:

1. Add kustomize, include files, add config
1. Add env generator
1. Update env to match env generator
1. Add labels
1. Removed unnecessary code from kompose