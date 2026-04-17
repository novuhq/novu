import { Injectable } from '@nestjs/common';
import type { EmojiFormats } from 'chat';
import { esmImport } from '../../utils/esm-import';

export interface AgentEmojiEntry {
  name: string;
  unicode: string;
}

@Injectable()
export class ListAgentEmoji {
  private cached: AgentEmojiEntry[] | null = null;

  async execute(): Promise<AgentEmojiEntry[]> {
    if (this.cached) return this.cached;

    const { DEFAULT_EMOJI_MAP } = await esmImport('chat');
    const map = DEFAULT_EMOJI_MAP as Record<string, EmojiFormats>;

    this.cached = Object.entries(map).map(([name, formats]) => ({
      name,
      unicode: Array.isArray(formats.gchat) ? formats.gchat[0] : formats.gchat,
    }));

    return this.cached;
  }
}
