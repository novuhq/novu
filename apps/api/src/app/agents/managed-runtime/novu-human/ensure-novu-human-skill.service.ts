import { Injectable } from '@nestjs/common';
import type { IAgentRuntimeProvider } from '@novu/application-generic';
import { PinoLogger } from '@novu/application-generic';
import { type AgentSkillDto, NOVU_HUMAN_SKILL_DISPLAY_TITLE, NOVU_HUMAN_SKILL_MD } from '@novu/shared';

@Injectable()
export class EnsureNovuHumanSkill {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Upload the Novu HITL skill and merge it into the create payload.
   * Anthropic requires a usable Read builtin to load skill bundles — createAgent
   * force-enables Read when any skill is present. Fail-open: never block provision.
   */
  async mergeForCreate(
    provider: IAgentRuntimeProvider,
    skills?: AgentSkillDto[]
  ): Promise<AgentSkillDto[] | undefined> {
    if (!provider.capabilities.skills) {
      return skills;
    }

    const uploaded = await this.upload(provider);
    if (!uploaded) {
      return skills;
    }

    return this.mergeSkills(skills, uploaded);
  }

  /**
   * After a platform-definition refresh, attach (or re-pin) the HITL skill.
   * `updateConfig({ skills })` force-enables Read when the skill set is non-empty.
   */
  async reconcile(provider: IAgentRuntimeProvider, externalAgentId: string): Promise<void> {
    if (!provider.capabilities.skills) {
      return;
    }

    const config = await provider.getConfig(externalAgentId);
    const uploaded = await this.upload(provider);
    if (!uploaded) {
      return;
    }

    const next = this.mergeSkills(config.skills, uploaded);
    if (next === config.skills) {
      return;
    }

    await provider.updateConfig(externalAgentId, { skills: next });
  }

  private mergeSkills(skills: AgentSkillDto[] | undefined, uploaded: AgentSkillDto): AgentSkillDto[] {
    const current = skills ?? [];
    const index = current.findIndex((skill) => skill.skillId === uploaded.skillId);

    if (index === -1) {
      return [...current, uploaded];
    }

    if (current[index].version === uploaded.version) {
      return skills ?? current;
    }

    return current.map((skill, skillIndex) => (skillIndex === index ? { ...skill, version: uploaded.version } : skill));
  }

  private async upload(provider: IAgentRuntimeProvider): Promise<AgentSkillDto | null> {
    try {
      const result = await provider.uploadSkill({
        displayTitle: NOVU_HUMAN_SKILL_DISPLAY_TITLE,
        files: [{ path: 'SKILL.md', content: Buffer.from(NOVU_HUMAN_SKILL_MD, 'utf8') }],
      });

      return { type: 'custom', skillId: result.skillId, version: result.version };
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'Novu HITL skill upload failed; continuing with the tool-only path'
      );

      return null;
    }
  }
}
