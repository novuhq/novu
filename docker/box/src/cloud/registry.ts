import { DurableObject } from 'cloudflare:workers';
import type { HostEnv } from './env.ts';

// The boxes `up` created and `delete` hasn't removed: every host under the domain reaches some Box object, so the
// names alone don't tell which exist.
export class Registry extends DurableObject<HostEnv> {
  async add(box: string): Promise<void> {
    await this.ctx.storage.put(`box:${box}`, true);
  }

  async remove(box: string): Promise<void> {
    await this.ctx.storage.delete(`box:${box}`);
  }

  async list(): Promise<Array<string>> {
    return [...(await this.ctx.storage.list({ prefix: 'box:' })).keys()].map((key) => key.slice('box:'.length)).sort();
  }
}
