import axios, { AxiosInstance } from 'axios';
import { Subscribers } from './subscribers/subscribers';
import { EventEmitter } from 'events';
import { Changes } from './changes/changes';
import { INovuConfiguration } from './novu.interface';
import { Events } from './events/events';
import { NotificationGroups } from './notification-groups/notification-groups';
import { NotificationTemplates } from './notification-template/notification-template';
import { Environments } from './environments/environments';
import { Feeds } from './feeds/feeds';

export class Novu extends EventEmitter {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;
  readonly subscribers: Subscribers;
  readonly environments: Environments;
  readonly events: Events;
  readonly changes: Changes;
  readonly notificationGroups: NotificationGroups;
  readonly notificationTemplates: NotificationTemplates;
  readonly feeds: Feeds;

  constructor(apiKey: string, config?: INovuConfiguration) {
    super();
    this.apiKey = apiKey;

    this.http = axios.create({
      baseURL: this.buildBackendUrl(config),
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
      },
    });

    this.subscribers = new Subscribers(this.http);
    this.environments = new Environments(this.http);
    this.events = new Events(this.http);
    this.trigger = this.events.trigger;
    this.broadcast = this.events.broadcast;
    this.changes = new Changes(this.http);
    this.notificationGroups = new NotificationGroups(this.http);
    this.notificationTemplates = new NotificationTemplates(this.http);
    this.feeds = new Feeds(this.http);
  }

  public trigger: typeof Events.prototype.trigger;

  public broadcast: typeof Events.prototype.broadcast;

  private buildBackendUrl(config: INovuConfiguration) {
    const novuVersion = 'v1';

    if (!config?.backendUrl) {
      return `https://api.novu.co/${novuVersion}`;
    }

    return config?.backendUrl.includes('novu.co/v')
      ? config?.backendUrl
      : config?.backendUrl + `/${novuVersion}`;
  }
}
