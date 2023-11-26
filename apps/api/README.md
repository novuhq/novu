<div align="center">
  <a href="https://novu.co" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/2233092/213641039-220ac15f-f367-4d13-9eaf-56e79433b8c1.png">
    <img src="https://user-images.githubusercontent.com/2233092/213641043-3bbb3f21-3c53-4e67-afe5-755aeb222159.png" width="280" alt="Logo"/>
  </picture>
  </a>
</div>

# @novu/api

A RESTful API for accessing the Novu platform, built using [NestJS](https://nestjs.com/).

## OpenAPI (formerly Swagger)

The Novu API utilizes the [`@nestjs/swagger`](https://github.com/nestjs/swagger) package to generate up-to-date OpenAPI specifications.

A web interface to browse the available endpoints is available at [api.novu.co/api](https://api.novu.co/api). An OpenAPI specification can be retrieved at [api.novu.co/api-json](https://api.novu.co/api-json).

## Running the API

See the docs for [Run in Local Machine](https://docs.novu.co/community/run-in-local-machine) to get setup. Then run:

```bash
# Run the API in watch mode
$ npm run start:api
```

## Test

### Unit Tests
```bash
# unit tests
$ npm run test
```

### E2E tests
See the docs for [Running on Local Machine - API Tests](https://docs.novu.co/community/run-in-local-machine#api).

## Migrations
Database migrations are included for features that have a hard dependency on specific data being available on database entities. These migrations are run by both Novu Cloud and Novu Self-Hosted users to support new feature releases.

### How to Run

The `npm run migration` script is available in the `package.json` to ensure script changes are DRY and consistent. This script is included in user-facing communications such as our documentation and release notes, and the script naming therefore MUST remain stable.

The path to the migration to run is passed as a positional argument to the script. For example, to run the Add Integration Identifier script, we would enter the following:

```bash
npm run migration -- ./migrations/integration-scheme-update/add-integration-identifier-migration.ts
```

### Conventions

These migrations live in the `./migrations` directory, and follow the naming convention of:
`./migrations/<CHANGE_DESCRIPTION>/<CHANGE_ACTION>.ts`. Each `<CHANGE_DESCRIPTION>` may have 1 or more `<CHANGE_ACTION>.ts` scripts. For example:

```
.
└── migrations/
    └── integration-scheme-update/
        ├── add-integration-identifier-migration.ts
        └── add-primary-priority-migration.ts
```
