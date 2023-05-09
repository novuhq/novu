/* eslint-disable @typescript-eslint/naming-convention */
import React from 'react';
import SandPack from '../../SandPack/SandPack';
import { customStyleCode } from './shared';

const files = {
  '/src/app/styles.ts': {
    code: customStyleCode,
    active: true,
  },

  '/src/app/app.component.html': `<div style="display: flex; flex-direction: column; align-items: center;">
<p style="width: 80%; text-align: center; font-size: 12px;">
  Change <b>subscriberId</b> and <b>applicationIdentifier</b> variables in
  <b>app.component.ts</b> file with valid values to remove loader.
</p>
<notification-center-component
  [subscriberId]="subscriberId"
  [applicationIdentifier]="applicationIdentifier"
  [sessionLoaded]="sessionLoaded"
  [colorScheme]="colorScheme"
  [position]="position"
  [styles]="styles"
></notification-center-component>
</div>`,
  '/src/app/app.component.ts': `import { Component } from "@angular/core";
import { styles } from "./styles";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html"
})
export class AppComponent {
  subscriberId = "YOUR_SUBSCRIBER_ID";
  applicationIdentifier = "YOUR_APPLICATION_IDENTIFIER";
  colorScheme = "light";
  position = "bottom";
  styles = styles;

  sessionLoaded = (data: unknown) => {
    console.log("loaded", { data });
  };
}`,

  '/src/app/app.module.ts': `import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { NotificationCenterModule } from "@novu/notification-center-angular";

import { AppComponent } from "./app.component";

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, NotificationCenterModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}`,

  '/src/main.ts': `import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";

import { AppModule } from "./app/app.module";

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.log(err));
`,
};

const AngularCustomStyling = () => {
  return <SandPack theme={'dark'} template="angular" files={files} />;
};

export default AngularCustomStyling;
