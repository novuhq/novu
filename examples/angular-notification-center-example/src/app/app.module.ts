/* eslint-disable multiline-comment-style */
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { NgElement, WithProperties } from '@angular/elements';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';

// the module from Angular package
import { NotificationCenterModule } from '@novu/notification-center-angular/dist/notification-center-angular';

// the Web Component
// import '@novu/notification-center';

// the Notification Center proxy component
// import { NotificationCenter } from './notification-center.component';

declare global {
  // eslint-disable-next-line
  interface HTMLElementTagNameMap {
    'notification-center-component': NgElement &
      WithProperties<{
        ['backend-url']: string;
        ['socket-url']: string;
        ['subscriber-id']: string;
        ['application-identifier']: string;
        asd: any;
      }>;
  }
}

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, NotificationCenterModule],
  providers: [],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
