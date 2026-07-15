/** Zod versions shared by ai-sdk and langchain agent scaffolds (subscription CLIs require Zod 4). */
export const AGENT_ZOD_DEPS = {
  zod: '^4.1.8',
  'zod-to-json-schema': '3.25.2',
} as const;

export function resolveAgentZodDependencies(): Record<string, string> {
  return { ...AGENT_ZOD_DEPS };
}
