<div align="center">
  
  ![Logo Dark](https://user-images.githubusercontent.com/8872447/165779319-34962ccc-3149-466c-b1da-97fd93254520.png#gh-dark-mode-only)

</div>

<div align="center">
  
  ![Logo Light](https://user-images.githubusercontent.com/8872447/165779274-22a190da-3284-487e-bd1e-14983df12cbb.png#gh-light-mode-only)
  
</div>

<h1 align="center">Notification management simplified.</h1>

## 🚀 Getting Started

### Docker Quick Start

```sh
cd novu/docker

cp .env.example .env

docker-compose up
```

### Development Mode

```sh
yarn setup:project
```

This will:

- run pnpm install, that will download all the needed dependencies and create symlinks for packages.
- will copy the .env.example file to the .env file for the API service
- will execute a npm run build command to build all the dependency tree locally.

#### Develop on API

##### Start other services with docker:

```sh
cd docker && docker-compose up redis mongodb web ws
```

##### Then start the api:

```sh
yarn start:api
```
