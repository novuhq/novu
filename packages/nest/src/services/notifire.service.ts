import { Inject, Injectable } from '@nestjs/common';
import { Notifire } from '@notifire/core';
import { NotifireOptions } from '../interfaces';
import { NOTIFIRE_OPTIONS } from '../helpers';

@Injectable()
export class NotifireService {
  private notifire: any;
  private readonly providers: Array<any>;
  private readonly templates: Array<any>;

  constructor(
    @Inject(NOTIFIRE_OPTIONS) private _NotifireOptions: NotifireOptions,
  ) {
    this.notifire = new Notifire();
    this.providers = this._NotifireOptions['providers'];
    this.templates = this._NotifireOptions['templates'];
  }

  get() {
    if (!this.notifire) {
      this.notifire = new Notifire();
    }
    return this.notifire;
  }

  async registerProviders(): Promise<any> {
    const providerPromises = [];

    for (let i = 0; i < this.providers.length; i += 1) {
      const waiting = await this.notifire.registerProvider(this.providers[i]);
      providerPromises.push(waiting);
    }

    return await Promise.all(providerPromises);
  }

  async registerTemplates(): Promise<any> {
    const templatePromises = [];

    for (let i = 0; i < this.templates.length; i += 1) {
      const waiting = await this.notifire.registerTemplate(this.templates[i]);
      templatePromises.push(waiting);
    }

    return await Promise.all(templatePromises);
  }
}
