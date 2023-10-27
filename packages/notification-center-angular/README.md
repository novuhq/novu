# NotificationCenterAngular

This is the Angular workspace root project for Novu Angular libraries and components. The libraries are located under `/projects/*`.
New libraries should also be added under `/projects/*` by using the `ng generate library <my-lib-name>` command.

## Publishing
To publish the `@novu/notification-center-angular` package, simply run `npm run publish:npm`. The following steps will be executed:

1. Build package into the `/dist/notification-center-angular` directory
2. Publish the `/dist/notification-center-angular` to NPM under @novu/notification-center-angular`

> ⚠️ Ensure that the `/projects/notification-center-angular/package.json` has the correct `@novu/*` version values before publishing

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
