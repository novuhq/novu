import axios, { AxiosInstance } from 'axios';
import { Subscribers } from './subscribers/subscribers';
import { EventEmitter } from 'events';
import { INovuConfiguration } from './novu.interface';
import { Events } from './events/events';

export class Novu extends EventEmitter {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;
  readonly subscribers: Subscribers;
  readonly events: Events;

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
    this.events = new Events(this.http);
    this.trigger = this.events.trigger;
    this.broadcast = this.events.broadcast;
  }

  /**
   * @deprecated Use {@link Events.trigger} instead.
   */
  public trigger: typeof Events.prototype.trigger;

  /**
   * @deprecated Use {@link Events.trigger} instead.
   */
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
