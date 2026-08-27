import { Injectable } from '@nestjs/common';
import type { IAgentRuntimeProvider } from '@novu/application-generic';
import { PinoLogger } from '@novu/application-generic';
import { type AgentSkillDto, NOVU_HUMAN_SKILL_DISPLAY_TITLE, NOVU_HUMAN_SKILL_MD } from '@novu/shared';

const SKILL_REQUIRED_TOOL = 'read';

@Injectable()
export class EnsureNovuHumanSkill {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Upload the Novu HITL skill and merge it into the create payload when the
   * agent can load skills (Read already selected, or other skills attached).
   * Fail-open — never block provision.
   */
  async mergeForCreate(
    provider: IAgentRuntimeProvider,
    tools?: string[],
    skills?: AgentSkillDto[]
  ): Promise<AgentSkillDto[] | undefined> {
    if (!this.shouldAttach(tools, skills) || !provider.capabilities.skills) {
      return skills;
    }

    const uploaded = await this.upload(provider);
    if (!uploaded) {
      return skills;
    }

    if (skills?.some((skill) => skill.skillId === uploaded.skillId)) {
      return skills;
    }

    return [...(skills ?? []), uploaded];
  }

  /**
   * After a platform-definition refresh, attach the HITL skill when Read is
   * already enabled or other skills exist. Does not force-enable Read.
   */
  async reconcile(provider: IAgentRuntimeProvider, externalAgentId: string): Promise<void> {
    if (!provider.capabilities.skills) {
      return;
    }

    const config = await provider.getConfig(externalAgentId);
    const toolTypes = config.tools.filter((tool) => tool.type === 'builtin').map((tool) => tool.externalId);
    if (!this.shouldAttach(toolTypes, config.skills)) {
      return;
    }

    const uploaded = await this.upload(provider);
    if (!uploaded) {
      return;
    }

    if (config.skills.some((skill) => skill.skillId === uploaded.skillId)) {
      return;
    }

    await provider.updateConfig(externalAgentId, {
      skills: [...config.skills, uploaded],
    });
  }

  private shouldAttach(tools?: string[], skills?: AgentSkillDto[]): boolean {
    const hasSkills = (skills?.length ?? 0) > 0;
    const hasRead = (tools ?? []).includes(SKILL_REQUIRED_TOOL);

    return hasSkills || hasRead;
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
