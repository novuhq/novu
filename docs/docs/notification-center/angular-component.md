---
sidebar_position: 5
---

# Angular Component

The `@novu/notification-center-angular` package provides an Angular component wrapper over the Notification Center Web Component that you can use to integrate the notification center into your Angular application.

## Installation

```bash
npm install @novu/notification-center-angular
```

## Example usage

Module:

```ts
import { NotificationCenterModule } from '@novu/notification-center-angular';

@NgModule({
  imports: [..., NotificationCenterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TheModule {}
```

Component:

```ts
import { Component } from '@angular/core';
import { environment } from '../environments/environment';

@Component({
  selector: 'my-component',
  templateUrl: './component.html',
})
export class AppComponent {
  subscriberId = environment.subscriberId;
  applicationIdentifier = environment.applicationIdentifier;

  sessionLoaded = (data: unknown) => {
    console.log('loaded', { data });
  };
}
```

Component HTML template:

```html
<notification-center-component
  [subscriberId]="subscriberId"
  [applicationIdentifier]="applicationIdentifier"
  [sessionLoaded]="sessionLoaded"
></notification-center-component>
```

## Props

The `notification-center-component` accepts the same set of props as the [Web Component](./web-component#properties).
