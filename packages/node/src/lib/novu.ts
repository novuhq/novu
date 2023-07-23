/* eslint-disable @typescript-eslint/no-throw-literal */
import axios, { AxiosInstance, AxiosResponse } from 'axios';
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
import { Workflows } from './workflows/workflows';
import {
  ITriggerPayloadOptions,
  IBulkEvents,
  IBroadcastPayloadOptions,
} from './events/events.interface';
import {
  BadRequestException,
  ServerException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from './exceptions';

export class Novu extends EventEmitter {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;
  readonly subscribers: Subscribers;
  readonly environments: Environments;
  readonly events: Events;
  readonly changes: Changes;
  readonly layouts: Layouts;
  readonly notificationGroups: NotificationGroups;
  /**
   * deprecated
   * use workflows instead
   */
  readonly notificationTemplates: NotificationTemplates;
  readonly workflows: Workflows;
  readonly feeds: Feeds;
  readonly topics: Topics;
  readonly integrations: Integrations;
  readonly messages: Messages;

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
    this.environments = new Environments(this);
    this.events = new Events(this);
    this.changes = new Changes(this.http);
    this.layouts = new Layouts(this);
    this.notificationGroups = new NotificationGroups(this);
    this.notificationTemplates = new NotificationTemplates(this);
    this.workflows = new Workflows(this);
    this.feeds = new Feeds(this.http);
    this.topics = new Topics(this);
    this.integrations = new Integrations(this);
    this.messages = new Messages(this);
  }

  public trigger(workflowIdentifier: string, data: ITriggerPayloadOptions) {
    return this.events.trigger(workflowIdentifier, data);
  }

  public bulkTrigger(events: IBulkEvents[]) {
    return this.events.bulkTrigger(events);
  }
  public broadcast(workflowIdentifier: string, data: IBroadcastPayloadOptions) {
    return this.events.broadcast(workflowIdentifier, data);
  }

  private buildBackendUrl(config?: INovuConfiguration) {
    const novuApiVersion = 'v1';

    if (!config?.backendUrl) {
      return `https://api.novu.co/${novuApiVersion}`;
    }

    return config?.backendUrl.includes('novu.co/v')
      ? config?.backendUrl
      : config?.backendUrl + `/${novuApiVersion}`;
  }

  async get(
    path: string,
    params?: Record<string, unknown>
  ): Promise<AxiosResponse> {
    try {
      if (params) {
        return await this.http.get(path, params);
      } else {
        return await this.http.get(path);
      }
    } catch (error: unknown) {
      this.handleError(error);
      throw error;
    }
  }

  async post(path: string, data?: unknown): Promise<AxiosResponse> {
    try {
      if (data) {
        return await this.http.post(path, data);
      } else {
        return await this.http.post(path);
      }
    } catch (error: unknown) {
      this.handleError(error);
      throw error;
    }
  }

  async delete(
    path: string,
    params?: Record<string, unknown>
  ): Promise<AxiosResponse> {
    try {
      if (params) {
        return await this.http.delete(path, params);
      } else {
        return await this.http.delete(path);
      }
    } catch (error: unknown) {
      this.handleError(error);
      throw error;
    }
  }

  async patch(path: string, data?: unknown): Promise<AxiosResponse> {
    try {
      if (data) {
        return await this.http.patch(path, data);
      } else {
        return await this.http.patch(path);
      }
    } catch (error: unknown) {
      this.handleError(error);
      throw error;
    }
  }

  async put(path: string, data?: unknown): Promise<AxiosResponse> {
    try {
      if (data) {
        return await this.http.put(path, data);
      } else {
        return await this.http.put(path);
      }
    } catch (error: unknown) {
      this.handleError(error);
      throw error;
    }
  }

  handleError(error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401: {
          const { message } = data;
          throw new UnauthorizedException(message);
        }
        case 400: {
          const { message } = data;
          throw new BadRequestException(message);
        }
        case 422: {
          const { message } = data;
          throw new UnprocessableEntityException(message);
        }
        case 404: {
          const { message } = data;
          throw new NotFoundException(message);
        }
        default: {
          throw new ServerException(status, data.message);
        }
      }
    }
  }
}
