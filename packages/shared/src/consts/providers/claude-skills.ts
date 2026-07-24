/**
 * Whether a skill is maintained by Anthropic or is open-source from the community.
 *
 * - `'anthropic'` – Official pre-built skills hosted and maintained by Anthropic.
 *   Referenced by a short `skill_id` (e.g. `"xlsx"`) in the Managed Agents API.
 *   Docs: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#available-skills
 *
 * - `'open-source'` – Community skills published in the Anthropic skills GitHub repo.
 *   Must be uploaded to `/v1/skills` and referenced by the resulting `skill_id`.
 *   Repo: https://github.com/anthropics/skills
 *   Not yet supported — reserved for future implementation.
 */
export type ClaudeSkillSource = 'anthropic' | 'open-source';

export type ClaudeAnthropicSkill = {
  /** The `skill_id` passed to the Anthropic API `skills` array */
  skillId: string;
  name: string;
  description: string;
  /**
   * Origin of the skill.
   * `'anthropic'` = official pre-built skill, usable directly by `skill_id`.
   * `'open-source'` = from https://github.com/anthropics/skills, requires upload first.
   */
  source: ClaudeSkillSource;
};

/**
 * Official pre-built Agent Skills provided by Anthropic.
 * These are available immediately — no upload required.
 * https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#pre-built-agent-skills
 */
const CLAUDE_PREBUILT_SKILLS: ClaudeAnthropicSkill[] = [
  {
    skillId: 'pptx',
    name: 'PowerPoint',
    description: 'Create presentations, edit slides, and analyze presentation content.',
    source: 'anthropic',
  },
  {
    skillId: 'xlsx',
    name: 'Excel',
    description: 'Create spreadsheets, analyze data, and generate reports with charts.',
    source: 'anthropic',
  },
  {
    skillId: 'docx',
    name: 'Word',
    description: 'Create documents, edit content, and format text.',
    source: 'anthropic',
  },
  {
    skillId: 'pdf',
    name: 'PDF',
    description: 'Generate formatted PDF documents and reports.',
    source: 'anthropic',
  },
];

/**
 * Open-source skills published by Anthropic in https://github.com/anthropics/skills.
 * These must be uploaded via POST /v1/skills before they can be referenced by skill_id.
 *
 * TODO: integrate once the /v1/skills upload flow is implemented. Until then this
 * catalog is parked here so we can add it to CLAUDE_ANTHROPIC_SKILLS in one step.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _CLAUDE_OPENSOURCE_SKILLS: ClaudeAnthropicSkill[] = [
  {
    skillId: 'claude-api',
    name: 'Claude API',
    description:
      'Build, debug, and optimize Claude API / Anthropic SDK apps. Handles prompt caching, model migrations, tool use, batch, files, and more.',
    source: 'open-source',
  },
  {
    skillId: 'algorithmic-art',
    name: 'Algorithmic Art',
    description:
      'Create generative art using p5.js with seeded randomness and interactive parameter exploration. Use for algorithmic art, flow fields, or particle systems.',
    source: 'open-source',
  },
  {
    skillId: 'brand-guidelines',
    name: 'Brand Guidelines',
    description:
      'Apply brand colors and typography to artifacts. Use when brand colors, style guidelines, visual formatting, or company design standards apply.',
    source: 'open-source',
  },
  {
    skillId: 'canvas-design',
    name: 'Canvas Design',
    description:
      'Create beautiful visual art in .png and .pdf documents using design philosophy. Use for posters, artwork, and other static visual designs.',
    source: 'open-source',
  },
  {
    skillId: 'doc-coauthoring',
    name: 'Doc Co-Authoring',
    description:
      'Guide a structured workflow for co-authoring documentation, proposals, technical specs, and decision docs.',
    source: 'open-source',
  },
  {
    skillId: 'frontend-design',
    name: 'Frontend Design',
    description:
      'Create distinctive, production-grade frontend interfaces. Use for web components, pages, dashboards, React components, or HTML/CSS layouts.',
    source: 'open-source',
  },
  {
    skillId: 'internal-comms',
    name: 'Internal Comms',
    description:
      'Write internal communications — status reports, leadership updates, company newsletters, FAQs, incident reports, and project updates.',
    source: 'open-source',
  },
  {
    skillId: 'mcp-builder',
    name: 'MCP Builder',
    description:
      'Guide for creating high-quality MCP (Model Context Protocol) servers in Python (FastMCP) or TypeScript (MCP SDK).',
    source: 'open-source',
  },
  {
    skillId: 'skill-creator',
    name: 'Skill Creator',
    description: 'Create new skills, modify and improve existing skills, run evals, and optimize skill performance.',
    source: 'open-source',
  },
  {
    skillId: 'slack-gif-creator',
    name: 'Slack GIF Creator',
    description: 'Create animated GIFs optimized for Slack with size constraints and animation concepts.',
    source: 'open-source',
  },
  {
    skillId: 'theme-factory',
    name: 'Theme Factory',
    description:
      'Style artifacts (slides, docs, reports, HTML pages) with pre-set or on-the-fly themes using curated color and font combinations.',
    source: 'open-source',
  },
  {
    skillId: 'web-artifacts-builder',
    name: 'Web Artifacts Builder',
    description:
      'Create elaborate multi-component HTML artifacts using React, Tailwind CSS, and shadcn/ui. Use for complex apps with state management or routing.',
    source: 'open-source',
  },
  {
    skillId: 'webapp-testing',
    name: 'Webapp Testing',
    description:
      'Interact with and test local web applications using Playwright. Verify frontend functionality, debug UI, capture screenshots, and view browser logs.',
    source: 'open-source',
  },
];

/** Pre-built skills provided by Anthropic. Open-source skills (require /v1/skills upload) are not yet supported. */
export const CLAUDE_ANTHROPIC_SKILLS: ClaudeAnthropicSkill[] = [...CLAUDE_PREBUILT_SKILLS];
