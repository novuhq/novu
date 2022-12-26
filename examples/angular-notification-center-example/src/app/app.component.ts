import { Component } from '@angular/core';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass'],
})
export class AppComponent {
  subscriberId = environment.subscriberId;
  applicationIdentifier = environment.applicationIdentifier;

  sessionLoaded = (data: unknown) => {
    console.log('loaded', { data });
  };
}
