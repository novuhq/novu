---
sidebar_position: 4
sidebar_label: Get started with Angular
---

# Angular Quickstart

Learn how to use Novu to quickly send multi-channel (SMS, Email, Chat, Push) notifications and integrate a rich, customizable and ready-to-use real-time UI In-App notification center in Angular apps.

## Requirements

To follow the steps in this quickstart, you'll need:

- A Novu account. [Sign up for free](http://web.novu.co) if you don’t have one yet.
- Angular CLI (Command Line Interface) installed on your machine
- Angular version > 0.15.0

You can also [view the completed code](https://github.com/novuhq/angular-quickstart) of this quick start in a GitHub repo.

## Create a new Angular app

To create a new Angular app, open a terminal or command prompt and 
run the following command:

```console
ng new my-app
```

Here, `my-app` is the name of your new Angular app. 
This command will create a new Angular app with a basic file structure and all the necessary dependencies installed.

Navigate to the app directory by running the following command:

```console
cd my-app
```

Once you are in the app directory, you can start the development server by running the following command:

```console
ng serve
```

This command will start the development server and launch your app in the default browser. You can access your app by navigating to `http://localhost:4200/`.

![go9ch8vqvatmroiiz8c5.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776582/go9ch8vqvatmroiiz8c5_okfqai.png)

## Install Novu Angular Notification Center Package

The Novu Angular package provides a Angular component wrapper over the web component that you can use to integrate the notification center into your Angular application.

Navigate to the root directory of your Angular application. Now install the Angular Notification Center package by running the following command in your terminal:

```console
npm install @novu/notification-center-angular

// or

yarn add @novu/notification-center-angular
```

## **Configuring Application Environments**

Using the Angular CLI, start by running the [generate environments command](https://angular.io/cli/generate#environments-command)

shown here to create the `src/environments/`directory and configure the 
project to use these files.

```console
ng generate environments
```

Navigate to `my-app/src/environments/environment.ts` 
and add the following variables: `subscriberId`, `applicationIdentifier`

**`Application Identifier`** can be found here:[https://web.novu.co/settings](https://web.novu.co/settings)

**`subscriberId`** can be found here: [https://web.novu.co/subscribers](https://web.novu.co/subscribers)

```tsx
export const environment = {
  production: false,
  subscriberId: '',
  applicationIdentifier: '',
};
```

Copy and paste the same code into `my-app/src/environments/environment.development.ts`

These variables are needed for the `GET` request our notification center will make to Novu’s API to actually push notifications into the feed.

## **Adding Novu Module**

Now, navigate to the `app.module.ts` \***\*file (my-app/src/app/app.module.ts)**:\*\*

- Import `CUSTOM_ELEMENTS_SCHEMA` from `'@angular/core'`
- Add Novu’s notification center module

```jsx
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { NotificationCenterModule } from '@novu/notification-center-angular';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, NotificationCenterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

Head to `my-app/src/app/app.component.ts` file.

<aside>
⚠️ The `app.component.ts` file is a critical part of an Angular application, as it 
defines the root component and provides the foundation for the rest of 
the app's functionality.

</aside>

Now, we are going to import the `environment` variables to make them accessible in the `app.component.html` and the `styles` properties of our notification center (there are many properties, but you can discover them later on)

```tsx
import { Component } from '@angular/core';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'my-app';

  subscriberId = environment.subscriberId;
  applicationIdentifier = environment.applicationIdentifier;

  styles = {
    bellButton: {
      root: {
        svg: {
          color: 'white',
          width: '45px',
          height: '40px',
          fill: 'white',
        },
      },
      dot: {
        rect: {
          fill: 'rgb(221, 0, 49)',
          strokeWidth: '0.2',
          stroke: 'white',
          width: '3.5px',
          height: '3.5px',
        },
        left: '40%',
      },
    },
    header: {
      root: {
        backgroundColor: '',
        '&:hover': { backgroundColor: '' },
        '.some_class': { color: '' },
      },
    },
    layout: {
      root: {
        backgroundColor: '',
      },
    },
    popover: {
      arrow: {
        backgroundColor: '',
        border: '',
      },
    },
  };

  sessionLoaded = (data: unknown) => {
    console.log('loaded', { data });
  };
}
```

The Angular component is generated as a wrapper around the original React component. This approach is clever, as it allows Novu's engineers to focus on creating and developing things in the React way. Additionally, many other frameworks can still use the created components using the wrapping approach.

We need to add `@types/react` as dev dependency for the angular component to work properly.

Open your terminal and navigate to the app root directory and type the following:

```console
npm i [@types/react](https://github.com/types/react)

// or

yarn add [@types/react](https://github.com/types/react)
```

Now head to the `my-app/tsconfig.json` file

And we’re going to add `"allowSyntheticDefaultImports": true` to the `compilerOptions` array.

```json
/* To learn more about this file see: https://angular.io/config/tsconfig. */
{
  "compileOnSave": false,
  "compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "baseUrl": "./",
    "outDir": "./dist/out-tsc",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "sourceMap": true,
    "declaration": false,
    "downlevelIteration": true,
    "experimentalDecorators": true,
    "moduleResolution": "node",
    "importHelpers": true,
    "target": "ES2022",
    "module": "ES2022",
    "useDefineForClassFields": false,
    "lib": ["ES2022", "dom"]
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
```

## Use & Display The Notification Center Component

Open the `my-app/src/app/app.component.html` file.

This file contain the CSS code along with the HTML one - ideally you should separate the CSS to the `my-app/src/app/app.component.css` file, but it’s not mandatory.

We will add our notification center to the .toolbar div.

Paste the following into your `app.component.html` file:

```jsx
<div id="bell-icon">
    <notification-center-component
      [subscriberId]="subscriberId"
      [applicationIdentifier]="applicationIdentifier"
      [sessionLoaded]="sessionLoaded"
      [styles]="styles"
    ></notification-center-component>
  </div>
```

And in the `<style>` tag, we also want to add some margin to our `#bell-icon` so that it looks good next to the other icons.

```css
.toolbar #bell-icon {
  height: '';
  margin: 0 16px;
}
```

Run your app again. Now you should see the bell icon (the notification center) in the toolbar section of your app.

You should now see a **bell button** that opens the notification center when clicked. This bell can be customized to your preference.

![rmovxzn2ktdizdsldgsl.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776582/rmovxzn2ktdizdsldgsl_cbcmf5.png)

![uv7tvfo08i8a0h2ppulr.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776584/uv7tvfo08i8a0h2ppulr_ukyj5c.png)

<aside>
📌 **Note:** There are no notifications because none has been triggered yet. When notifications are sent to a subscriber, it will show up in the UI. Next, we'll learn how to trigger notifications.

</aside>

## Create A Notification Template

The first step to trigger notifications is to create a notification template. A template is like a map that holds the entire flow of messages sent to the subscriber.

<aside>
📌 The recipients of a triggered notification are called subscribers.

</aside>

The template includes the following:

- Notification template name and Identifier
- Channel tailored content:

| Channel                                                      | Content Style                                                                                 |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Email                                                        | 1. Custom Code (HTML) with option to use custom variables via the handlebars , {{ }}, syntax. |
| 2. Click and place UI items with the visual template editor. |
| SMS                                                          | Text with the option to use handlebars syntax, {{ }} to inject custom variables.              |
| Chat                                                         | Text with the option to use handlebars syntax, {{ }} to inject custom variables.              |
| In-App                                                       | Text                                                                                          |

Please proceed to create a notification template.

1. Click **Notifications** on the left sidebar of your Novu dashboard.
2. Click the **“Create Workflow”** button on the top right.
3. The name of a new notification template is currently "Untitled." Rename it to a more suitable title.
4. Select **"In-App"** as the channel you want to add.

![untitled-in-app-notification-template.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776583/untitled-in-app-notification-template_ya7yd4.png)

1. Click on the recently added **"In-App"** channel and configure it according to your preferences. Once you’re done, click “Update” to save your configuration.

![in-app-configuration.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776583/in-app-configuration_mmzx98.png)

I’ll briefly explain the function of each label in the image above.

- **1 - Preview**: Shows you a glimpse of how each notification item will look like in the Notification Center UI.
- **2 - Avatar:** If turned on, each notification item will show the avatar of the subscriber.
- 3 - **Action:** With this, you can add a primary and secondary call to action button to each notification item.
- **4 - Notification Feeds:** This displays a stream of specific notifications. You can have multiple feeds to show specific notifications in multiple tabs.
- **5 - Redirect URL** - This is the URL to which a subscriber can be directed when they click on a notification item.
- **6 - Filter** - This feature allows you to configure the criteria for delivering notifications. For instance, you can apply a filter based on a subscriber's online status to send them an email if they were online within the last hour. Read [more about filters](https://docs.novu.co/platform/step-filter/#subscriber-seen--read-filters).
- **Editor** - You can add text that you want displayed in each notification item. Additionally, you can specify custom variables using `{{ }}`. This means you can inject variables from your code into a notification item's text via a payload.

1. Feel free to add only text for now and rename the notification template to `Onboarding In App`. It automatically creates a slug-like identifier that will be needed in later steps to trigger a notification.

![Screenshot 2023-05-21 at 09.33.43.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776584/Screenshot_2023-05-21_at_09.33.43_ujx2td.png)

![Screenshot 2023-05-21 at 09.20.51.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776585/Screenshot_2023-05-21_at_09.20.51_cueewk.png)

Next, we’ll learn how to create subscribers on Novu - _Recipients of Notifications_

## Create A Subscriber

Click **Subscribers** on the left sidebar of the [Novu dashboard](https://web.novu.co/subscribers) to see all subscribers. By default, the dashboard will display a subscriber, as you were added automatically during sign up.

![subscribers.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776584/subscribers_ppir3w.png)

Now, let's create a subscriber on Novu.

Novu has a plethora of backend SDKs (Node.js, PHP, .NET, Go, Ruby, Python and Kotlin) to choose from to create a subscriber programmatically. This is the recommended method.

<iframe width="800" height="450" src="https://codesandbox.io/p/sandbox/create-subscriber-m5uibf?file=%2Findex.js%3A1%2C1&embed=1" allowfullscreen></iframe>

```jsx
import { Novu } from '@novu/node';

const novu = new Novu('<YOUR_NOVU_API_KEY>');

await novu.subscribers.identify('132', {
  email: 'john.doe@domain.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+13603963366',
});
```

<iframe width="800" height="450" src="[https://codesandbox.io/p/sandbox/clever-matan-m5uibf?embed=1](https://codesandbox.io/p/sandbox/clever-matan-m5uibf?embed=1)" allowfullscreen></iframe>

Obtain your API key from your [Novu dashboard.](https://web.novu.co/settings) Replace `YOUR_NOVU_API_KEY_HERE` with it.

Now check your Novu dashboard. You should see the recently created subscriber.

You can also update the subscriber info like so:

<iframe width="800" height="450" src="https://codesandbox.io/p/sandbox/create-subscriber-forked-r625n3?file=%2Findex.js%3A21%2C1&embed=1" allowfullscreen></iframe>

```jsx
import { Novu } from '@novu/node';

const novu = new Novu('<YOUR_NOVU_API_KEY>');

await novu.subscribers.update('132', {
  email: 'janedoe@domain.com', // new email
  phone: '+19874567832', // new phone
});
```

## Trigger A Notification

To trigger a notification, simply run the codesandbox below with the correct credentials.

```jsx
import { Novu } from '@novu/node';

const novu = new Novu('<YOUR_NOVU_API_KEY>');

await novu.trigger('onboarding-in-app', {
  to: {
    subscriberId: '132',
  },
});
```

`onboarding-in-app` is the Notification template identifier we created earlier.

Ensure the `subscriberId` value in the backend code that triggers the notification matches the `subscriberId` in your `my-app/src/environments/environment.ts` code.

```jsx
export const environment = {
  production: false,
  subscriberId: '',
  applicationIdentifier: '',
};
```

Check your app again. You should see the recently triggered notification!

## **Next Steps**

Great job! If you've reached this point, you should now have successfully set up the notification center, created a subscriber, notification template, configured a channel provider and triggered a notification in your Angular application.

To learn more about the Notification Center and explore Novu's features and capabilities, check out, check out:

- [Novu Notification Center](https://docs.novu.co/notification-center/web-component#properties) - Learn how to integrate a rich, ready-to-use real-time UI notification center into your app.
- [Novu Digest Engine](https://docs.novu.co/platform/digest) - Learn how to aggregate multiple trigger events into a single message and deliver it to the subscriber.
