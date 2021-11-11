import { Inject, Injectable } from '@nestjs/common';
import { IProvider, ITemplate, Notifire } from '@notifire/core';
import { NotifireOptions } from '../interfaces';
import { NOTIFIRE_OPTIONS } from '../helpers';

@Injectable()
export class NotifireService {
  private notifire: any;
  private readonly providers: IProvider[];
  private readonly templates: ITemplate[];

  constructor(
    @Inject(NOTIFIRE_OPTIONS) private _NotifireOptions: NotifireOptions
  ) {
    this.notifire = new Notifire();
    this.providers = this._NotifireOptions.providers;
    this.templates = this._NotifireOptions.templates;
  }

  get() {
    if (!this.notifire) {
      this.notifire = new Notifire();
    }
    return this.notifire;
  }

  async registerProviders(): Promise<void> {
    for (const provider of this.providers) {
      await this.notifire.registerProvider(provider);
    }
  }

  async registerTemplates(): Promise<void> {
    for (const template of this.templates) {
      await this.notifire.registerTemplate(template);
    }
  }
}
