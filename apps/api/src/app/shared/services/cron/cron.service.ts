// eslint-disable-next-line import/no-named-default,  import/no-duplicates
import { AgendaConfig, Processor } from 'agenda';
// eslint-disable-next-line import/no-duplicates
import * as Agenda from 'agenda';

export class CronService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private agenda: Agenda.Agenda = new (Agenda as any)({
    db: {
      address: this.config.mongoUrl,
    },
  } as AgendaConfig);

  constructor(private config: { mongoUrl: string }) {}

  async initialize() {
    await this.agenda.start();
  }

  define<T>(name: string, callback: Processor): void {
    this.agenda.define(name, callback);
  }

  async processEvery(name: string, interval: string) {
    await this.agenda.every(interval, name, {}, {});
  }

  async processNow(name: string) {
    await this.agenda.now(name, null);
  }
}
