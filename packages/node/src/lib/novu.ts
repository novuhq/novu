import axios, { AxiosInstance } from 'axios';
import { getEnvVariable } from '@novu/shared/utils';
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
import { ExecutionDetails } from './execution-details/execution-details';
import { InboundParse } from './inbound-parse/inbound-parse';
import { Organizations } from './organizations/organizations';
import { WorkflowOverrides } from './workflow-override/workflow-override';

import { makeRetryable } from './retry';

export class Novu extends EventEmitter {
  public readonly apiKey?: string;
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
  readonly executionDetails: ExecutionDetails;
  readonly inboundParse: InboundParse;
  readonly organizations: Organizations;
  readonly workflowOverrides: WorkflowOverrides;

  constructor(config?: INovuConfiguration);
  constructor(apiKey: string, config?: INovuConfiguration);
  constructor(...args: any) {
    super();

    let apiKey: string | undefined;
    let config: INovuConfiguration | undefined;

    if (arguments.length === 2) {
      apiKey = args[0];
      config = args[1];
    } else if (arguments.length === 1) {
      if (typeof args[0] === 'object') {
        const { apiKey: key, ...rest } = args[0];
        apiKey = key;
        config = rest;
      } else {
        apiKey = args[0];
      }
    } else {
      apiKey = getEnvVariable('NOVU_API_KEY');
    }

    this.apiKey = apiKey;
    const axiosInstance = axios.create({
      baseURL: this.buildBackendUrl(config),
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
      },
    });

    if (config?.retryConfig) {
      makeRetryable(axiosInstance, config);
    }

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
    this.executionDetails = new ExecutionDetails(this.http);
    this.inboundParse = new InboundParse(this.http);
    this.organizations = new Organizations(this.http);
    this.workflowOverrides = new WorkflowOverrides(this.http);

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
