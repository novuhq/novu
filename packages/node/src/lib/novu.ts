import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { v4 as uuid } from 'uuid';
import { Subscribers } from './subscribers/subscribers';
import { EventEmitter } from 'events';
import { Changes } from './changes/changes';
import { INovuConfiguration } from './novu.interface';
import { Events } from './events/events';
import { Layouts } from './layouts/layouts';
import { NotificationGroups } from './notification-groups/notification-groups';
import { NotificationTemplates } from './notification-template/notification-template';
import { Environments } from './environments/environments';
import { Feeds } from './feeds/feeds';
import { Topics } from './topics/topics';
import { Integrations } from './integrations/integrations';
import { Messages } from './messages/messages';
import { Tenants } from './tenants/tenants';

export class Novu extends EventEmitter {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;
  readonly subscribers: Subscribers;
  readonly environments: Environments;
  readonly events: Events;
  readonly changes: Changes;
  readonly layouts: Layouts;
  readonly notificationGroups: NotificationGroups;
  readonly notificationTemplates: NotificationTemplates;
  readonly feeds: Feeds;
  readonly topics: Topics;
  readonly integrations: Integrations;
  readonly messages: Messages;
  readonly tenants: Tenants;

  constructor(apiKey: string, config?: INovuConfiguration) {
    super();
    this.apiKey = apiKey;

    const axiosInstance = axios.create({
      baseURL: this.buildBackendUrl(config),
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
      },
    });

    axiosInstance.interceptors.request.use((axiosConfig) => {
      const idempotencyKey = axiosConfig.headers['Idempotency-Key'];
      // that means intercepted request is retried, so don't generate new idempotency key
      if (idempotencyKey) {
        return axiosConfig;
      }

      axiosConfig.headers['Idempotency-Key'] = uuid();

      return axiosConfig;
    });

    const retryConfig = config?.retryConfig || {};
    const retries = retryConfig.retryMax || 0;
    const minDelay = retryConfig.waitMin || 1;
    const maxDelay = retryConfig.waitMax || 30;
    const initialDelay = retryConfig.initialDelay || minDelay;

    function backoff(retryCount: number) {
      if (retryCount === 1) {
        return initialDelay;
      }

      const delay = retryCount * minDelay;
      if (delay > maxDelay) {
        return maxDelay;
      }

      return delay;
    }

    axiosRetry(axiosInstance, {
      retries,
      retryDelay(retryCount) {
        return backoff(retryCount) * 1000; // return delay in milliseconds
      },
    });

    this.http = axiosInstance;

    this.subscribers = new Subscribers(this.http);
    this.environments = new Environments(this.http);
    this.events = new Events(this.http);
    this.changes = new Changes(this.http);
    this.layouts = new Layouts(this.http);
    this.notificationGroups = new NotificationGroups(this.http);
    this.notificationTemplates = new NotificationTemplates(this.http);
    this.feeds = new Feeds(this.http);
    this.topics = new Topics(this.http);
    this.integrations = new Integrations(this.http);
    this.messages = new Messages(this.http);
    this.tenants = new Tenants(this.http);

    this.trigger = this.events.trigger;
    this.bulkTrigger = this.events.bulkTrigger;
    this.broadcast = this.events.broadcast;
  }

  public trigger: typeof Events.prototype.trigger;

  public bulkTrigger: typeof Events.prototype.bulkTrigger;

  public broadcast: typeof Events.prototype.broadcast;

  private buildBackendUrl(config?: INovuConfiguration) {
    const novuApiVersion = 'v1';

    if (!config?.backendUrl) {
      return `https://api.novu.co/${novuApiVersion}`;
    }

    return config?.backendUrl.includes('novu.co/v')
      ? config?.backendUrl
      : config?.backendUrl + `/${novuApiVersion}`;
  }
}
