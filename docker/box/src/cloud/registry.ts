import { DurableObject } from 'cloudflare:workers';
import type { HostEnv } from './env.ts';

// The boxes `up` created and `delete` hasn't removed; only their hosts reach a Box object.
export class Registry extends DurableObject<HostEnv> {
  async add(box: string): Promise<void> {
    await this.ctx.storage.put(`box:${box}`, true);
  }

  async has(box: string): Promise<boolean> {
    return Boolean(await this.ctx.storage.get(`box:${box}`));
  }

  async remove(box: string): Promise<void> {
    await this.ctx.storage.delete(`box:${box}`);
  }

  async list(): Promise<Array<string>> {
    return [...(await this.ctx.storage.list({ prefix: 'box:' })).keys()].map((key) => key.slice('box:'.length)).sort();
  }
}
