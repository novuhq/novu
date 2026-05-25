import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AnalyticsService, FeatureFlagsService, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import {
  CLAUDE_ANTHROPIC_SKILLS,
  CLAUDE_BUILTIN_TOOLS,
  CLAUDE_DEFAULT_TOOL_TYPES,
  FeatureFlagsKeysEnum,
  MCP_SERVERS,
} from '@novu/shared';

import { GenerateManagedAgentCommand } from './generate-managed-agent.command';
import { type ManagedAgentGenerationOutput, managedAgentGenerationSchema } from './managed-agent-generation.schema';

const GENERATION_MODEL = 'gpt-5-mini';
const GENERATION_PROVIDER = 'openai' as const;
const GENERATION_SOURCE = 'managed-agent-generation';
const MAX_OUTPUT_TOKENS = 4096;

export type GeneratedManagedAgentResult = {
  name: string;
  identifier: string;
  systemPrompt: string;
  tools: string[];
  mcpServers: string[];
  skills: Array<{ skillId: string }>;
};

type EeAiModule = {
  LlmService: new (
    ...args: unknown[]
  ) => {
    generateObject(input: {
      model: string;
      provider: 'openai' | 'anthropic';
      systemPrompt: string;
      userPrompt: string;
      schema: typeof managedAgentGenerationSchema;
      maxOutputTokens: number;
      onTokenUsage?: (usage: {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
        cachedInputTokens?: number;
      }) => void;
    }): Promise<ManagedAgentGenerationOutput>;
    getConfig(): { serviceTier?: string };
  };
  TokenUsageTracker: new () => {
    addEntry(entry: {
      model: string;
      source: string;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      cachedInputTokens?: number;
    }): void;
  };
  trackTokenUsage: (options: {
    tracker: InstanceType<EeAiModule['TokenUsageTracker']>;
    analyticsService: AnalyticsService;
    logger: PinoLogger;
    userId: string;
    organizationId: string;
    environmentId: string;
    chatId: string;
    serviceTier?: string;
    isAborted: boolean;
  }) => void;
};

function buildToolCatalog(): string {
  return CLAUDE_BUILTIN_TOOLS.map((tool) => `- ${tool.type}: ${tool.description}`).join('\n');
}

function buildMcpCatalog(): string {
  return MCP_SERVERS.map((server) => `- ${server.id} (${server.name}): ${server.description}`).join('\n');
}

function buildSkillCatalog(): string {
  return CLAUDE_ANTHROPIC_SKILLS.map((skill) => `- ${skill.skillId} (${skill.name}): ${skill.description}`).join('\n');
}

function buildSelfHostedSystemPrompt(): string {
  return `You are an expert AI agent architect for Novu. The user will describe — in plain English — what they want an agent to do. Your job is to scaffold the bare-bones agent metadata that Novu will use to provision a self-hosted agent runtime (AI SDK, LangChain, custom code, etc.). The user wires up their own tools, MCP servers and integrations — do NOT pick any of those.

Pick a clear human name, derive a kebab-case identifier, and write a system prompt as if instructing the agent. Return empty arrays for \`tools\`, \`mcpServers\`, and \`skills\` — those are populated by the user's own runtime.

## System prompt
The \`systemPrompt\` is sent verbatim to the agent. Address the agent in second person ("You are a…"), describe its role, scope, tone, and the workflow it should follow when invoked. Do not reference Anthropic-specific tools, MCPs or skills — the runtime is custom.

Return a JSON object matching the provided schema. Do not include any commentary outside the schema.`;
}

function buildSystemPrompt(): string {
  return `You are an expert AI agent architect for Novu. The user will describe — in plain English — what they want a Claude Managed Agent to do. Your job is to translate that description into a complete agent configuration that Novu will provision against the Anthropic Managed Agents API.

You MUST select Claude built-in tools, MCP servers, and Anthropic Skills ONLY from the provided catalogs. Do not invent IDs that are not in the catalogs.

## Tool selection
- ALWAYS include \`web_search\` and \`web_fetch\` — every Novu agent should be able to pull live context from the web. Only omit them if the user explicitly forbids web access.
- Add \`bash\`/\`read\`/\`write\`/\`edit\`/\`glob\`/\`grep\` only when the agent must work with files (code review, data files, repo automation, etc.).

## MCP selection
- Decide per domain whether the agent actually needs an MCP. Many agents are pure reasoning / writing / summarisation tasks and need NO MCP at all — return an empty array in that case.
- Attach an MCP only when the agent's job clearly requires reading from or writing to an external SaaS system (issue trackers, CRMs, observability, support inboxes, knowledge bases, etc.). If the description doesn't imply a system of record, do not attach one.
- When the user names a SaaS product (GitHub, Linear, Slack, Notion, …), include the matching MCP.
- When the user implies a domain and an external system is genuinely required, pick the most popular MCPs for that domain. Examples (non-exhaustive, only relevant if the agent needs to read/write that system):
  - Customer feedback / support / voice-of-customer → \`intercom\`, \`linear\`, \`notion\`
  - Code review / PRs / repo automation → \`github\`, \`linear\`
  - Incidents / on-call / alerting → \`sentry\`, \`datadog\`, \`pagerduty\`
  - Product analytics / experimentation → \`amplitude\`, \`linear\`, \`notion\`
  - Marketing / sales / CRM → \`hubspot\`, \`salesforce\`, \`apollo\`
  - Knowledge / docs / onboarding → \`notion\`, \`atlassian-rovo\`, \`google-drive\`
  - Status updates / team summaries / digests → \`slack\`, \`linear\`, \`notion\`
- Prefer \`popular: true\` servers when multiple options match.
- Never attach more than 5 MCPs. Quality over quantity — fewer focused MCPs beat a long list.

## Skill selection
- Anthropic skills are for file generation (pdf, xlsx, docx, pptx, …). Only attach when the agent must produce one of those file types. Otherwise return an empty array.

## System prompt
The \`systemPrompt\` is sent verbatim to Claude. Address the agent in second person ("You are a…"), describe its role, scope, tone, and the workflow it should follow when invoked. Do not enumerate the tool/MCP/skill IDs in the systemPrompt — Anthropic wires them in automatically.

## Identifier
The \`identifier\` MUST be a kebab-case slug of the \`name\` (lowercase, hyphen-separated, ASCII only).

## Catalogs
Available built-in tool types:
${buildToolCatalog()}

Available MCP servers (catalog id : name : description):
${buildMcpCatalog()}

Available Anthropic skills (skill_id : name : description):
${buildSkillCatalog()}

Return a JSON object matching the provided schema. Do not include any commentary outside the schema.`;
}

function buildUserPrompt(prompt: string): string {
  return `The user described their desired agent as:

"""
${prompt.trim()}
"""

Generate the complete agent configuration JSON. Pick a clear human name, derive a matching kebab-case identifier, write the systemPrompt as if instructing the agent, and select only the tools, MCP servers, and skills this agent actually needs — leave any array empty when its domain does not call for it.`;
}

/**
 * Backfills sensible defaults so that even when the LLM is overly conservative the agent
 * still ships with the baseline web tools. Without this, prompts that omit a clear "use X"
 * cue (e.g. "Build a Customer Feedback Agent That Groups Requests by Theme") would surface
 * an agent with no tools or MCPs attached, which is a poor first-run experience.
 */
function ensureDefaultTools(tools: string[]): string[] {
  const seen = new Set(tools);
  for (const defaultTool of CLAUDE_DEFAULT_TOOL_TYPES) {
    if (!seen.has(defaultTool)) {
      tools.push(defaultTool);
      seen.add(defaultTool);
    }
  }

  return tools;
}

/**
 * Generates a Claude managed-agent configuration from a free-form prompt.
 *
 * Lives in the API agents module so the agent-generation domain logic stays close to the rest of
 * the agents code. The actual LLM call relies on `LlmService` from `@novu/ee-ai`, which is loaded
 * lazily via `require` so the API package remains buildable when the EE module is absent (OSS).
 */
@Injectable()
export class GenerateManagedAgent {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: PinoLogger
  ) {}

  @InstrumentUsecase()
  async execute(command: GenerateManagedAgentCommand): Promise<GeneratedManagedAgentResult> {
    const { user, prompt } = command;
    const runtime = command.runtime ?? 'managed';
    const { organizationId, environmentId, _id: userId } = user;

    // Self-hosted scaffolding does not provision anything on Anthropic Managed Agents — it just
    // emits name/identifier/systemPrompt for the caller's own runtime. There is therefore no
    // reason to gate it on IS_MANAGED_AGENT_RUNTIME_ENABLED. Managed generation still requires
    // the flag because the resulting agent will be provisioned on Anthropic.
    if (runtime === 'managed') {
      const isEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_MANAGED_AGENT_RUNTIME_ENABLED,
        defaultValue: false,
        organization: { _id: organizationId },
      });

      if (!isEnabled) {
        throw new ForbiddenException('Managed agent generation is not enabled for this organization');
      }
    }

    const eeAi = this.loadEeAi();
    const llmService = this.moduleRef.get(eeAi.LlmService, { strict: false });
    const tokenUsageTracker = new eeAi.TokenUsageTracker();

    const isManagedRuntime = runtime === 'managed';
    const systemPrompt = isManagedRuntime ? buildSystemPrompt() : buildSelfHostedSystemPrompt();

    const generated = await llmService.generateObject({
      model: GENERATION_MODEL,
      provider: GENERATION_PROVIDER,
      systemPrompt,
      userPrompt: buildUserPrompt(prompt),
      schema: managedAgentGenerationSchema,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      onTokenUsage: (usage) => {
        tokenUsageTracker.addEntry({
          model: GENERATION_MODEL,
          source: GENERATION_SOURCE,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          cachedInputTokens: usage.cachedInputTokens,
        });
      },
    });

    eeAi.trackTokenUsage({
      tracker: tokenUsageTracker,
      analyticsService: this.analyticsService,
      logger: this.logger,
      userId,
      organizationId,
      environmentId,
      chatId: `managed-agent-generation-${organizationId}`,
      serviceTier: llmService.getConfig().serviceTier,
      // `LlmService.generateObject` doesn't yet accept an AbortSignal, so the await above
      // resolves even when the client has disconnected. Reading `signal.aborted` here lets
      // analytics still reflect that the request was abandoned client-side.
      isAborted: command.signal?.aborted ?? false,
    });

    // Self-hosted agents do not consume the Anthropic catalog — drop any tools/MCPs/skills the
    // LLM may have emitted so the dashboard never tries to provision them.
    if (!isManagedRuntime) {
      return {
        name: generated.name,
        identifier: generated.identifier,
        systemPrompt: generated.systemPrompt,
        tools: [],
        mcpServers: [],
        skills: [],
      };
    }

    return {
      name: generated.name,
      identifier: generated.identifier,
      systemPrompt: generated.systemPrompt,
      tools: ensureDefaultTools([...generated.tools]),
      mcpServers: generated.mcpServers,
      skills: generated.skills.map((skill) => ({ skillId: skill.skillId })),
    };
  }

  private loadEeAi(): EeAiModule {
    try {
      // biome-ignore lint/style/noCommonJs: dynamic require keeps the EE module optional for OSS builds
      const eeAi = require('@novu/ee-ai');
      if (!eeAi?.LlmService || !eeAi?.TokenUsageTracker || typeof eeAi?.trackTokenUsage !== 'function') {
        throw new Error('Required @novu/ee-ai exports are not available in the current build');
      }

      return eeAi;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to load @novu/ee-ai for managed-agent generation');
      throw new ServiceUnavailableException('Managed agent generation is unavailable in this deployment');
    }
  }
}
