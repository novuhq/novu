import fs from "node:fs";
import path from "node:path";
import {
  type InstalledSkill,
  installSkills,
  resolveSkillHosts,
} from "../../../wizard/skills/install-skills";
import { buildChatSdkAgentPrompt } from "./skill-instructions";
import { mergeProjectEnv } from "./wire-env";

export type SkillSetupInput = {
  projectDir: string;
  secretKey: string;
  agentIdentifier: string;
  apiBaseUrl?: string;
  overwriteSecretKey?: boolean;
};

export type SkillSetupResult = {
  envPaths: string[];
  updatedKeys: string[];
  skillsInstalled: InstalledSkill[];
  agentPrompt: string;
};

export async function runChatSdkSkillSetup(
  input: SkillSetupInput,
): Promise<SkillSetupResult> {
  const projectDir = path.resolve(input.projectDir);

  const merge = mergeProjectEnv({
    projectDir,
    secretKey: input.secretKey,
    agentIdentifier: input.agentIdentifier,
    apiBaseUrl: input.apiBaseUrl,
    overwriteSecretKey: input.overwriteSecretKey,
  });

  const skillHosts = resolveSkillHosts(projectDir);
  const { installed: skillsInstalled } = installSkills(projectDir, skillHosts);

  const agentPrompt = buildChatSdkAgentPrompt({
    projectDir,
  });

  return {
    envPaths: merge.envPaths,
    updatedKeys: merge.updatedKeys,
    skillsInstalled: skillsInstalled.filter(
      (skill) => skill.name === "novu-chat-sdk",
    ),
    agentPrompt,
  };
}
