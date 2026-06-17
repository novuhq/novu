import fs from "node:fs";
import path from "node:path";
import type { PackageManager } from "../../../init/helpers/get-pkg-manager";
import { installPackages } from "../../../init/helpers/install";
import { getTemplateFile } from "../../../init/templates";
import { TemplateTypeEnum } from "../../../init/templates/types";
import {
  type InstalledSkill,
  installSkills,
  resolveSkillHosts,
} from "../../../wizard/skills/install-skills";
import { detectChatSdkLayout } from "./detect-chat-layout";
import { patchExistingBot } from "./patch-existing-bot";
import { mergeEnvLocal } from "./wire-env";

export type AdapterIntegrationMode =
  | "merged-existing-bot"
  | "scaffolded-novu-module"
  | "skill-only";

export type AdapterIntegrationInput = {
  projectDir: string;
  secretKey: string;
  agentIdentifier: string;
  apiBaseUrl?: string;
  overwriteSecretKey?: boolean;
  silent?: boolean;
};

export type AdapterIntegrationResult = {
  envPath: string;
  updatedKeys: string[];
  adapterInstalled: boolean;
  skillsInstalled: InstalledSkill[];
  bridgeFilesAdded: string[];
  integrationMode: AdapterIntegrationMode;
  botFilePatched?: string;
  duplicateNovuModuleDetected: boolean;
  bridgeRoute: "/api/webhooks/novu";
  bridgeWired: boolean;
  /** True when automatic wiring could not finish — user should prompt their coding agent. */
  needsAgentFollowUp: boolean;
};

type NextAppLayout = {
  appDir: string;
  libDir: string;
  importPrefix: string;
};

const ADAPTER_PACKAGE = "@novu/chat-sdk-adapter";
const BRIDGE_ROUTE = "/api/webhooks/novu" as const;

export function detectProjectPackageManager(
  projectDir: string,
): PackageManager {
  if (fs.existsSync(path.join(projectDir, "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  if (fs.existsSync(path.join(projectDir, "yarn.lock"))) {
    return "yarn";
  }

  if (fs.existsSync(path.join(projectDir, "bun.lockb"))) {
    return "bun";
  }

  return "npm";
}

function readPackageJson(projectDir: string): Record<string, unknown> | null {
  const packageJsonPath = path.join(projectDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function hasDependency(pkg: Record<string, unknown>, name: string): boolean {
  const sections = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ] as const;

  return sections.some((section) => {
    const deps = pkg[section];
    if (!deps || typeof deps !== "object") {
      return false;
    }

    return Object.prototype.hasOwnProperty.call(deps, name);
  });
}

function detectNextAppLayout(projectDir: string): NextAppLayout | null {
  const candidates: NextAppLayout[] = [
    {
      appDir: path.join(projectDir, "app"),
      libDir: path.join(projectDir, "lib"),
      importPrefix: "@/lib",
    },
    {
      appDir: path.join(projectDir, "src", "app"),
      libDir: path.join(projectDir, "src", "lib"),
      importPrefix: "@/lib",
    },
  ];

  for (const layout of candidates) {
    if (fs.existsSync(layout.appDir)) {
      return layout;
    }
  }

  return null;
}

function copyTemplateFile(
  templateRelativePath: string,
  destination: string,
): void {
  const source = getTemplateFile({
    template: TemplateTypeEnum.APP_CHAT_SDK,
    mode: "ts",
    file: templateRelativePath,
  });

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function scaffoldNovuModuleFiles(projectDir: string): string[] {
  const layout = detectNextAppLayout(projectDir);
  if (!layout) {
    return [];
  }

  const added: string[] = [];
  const agentDest = path.join(layout.libDir, "novu", "agent.ts");
  const routeDest = path.join(
    layout.appDir,
    "api",
    "webhooks",
    "novu",
    "route.ts",
  );

  if (!fs.existsSync(agentDest)) {
    copyTemplateFile("lib/novu/agent.ts", agentDest);
    added.push(path.relative(projectDir, agentDest));
  }

  if (!fs.existsSync(routeDest)) {
    copyTemplateFile("app/api/webhooks/novu/route.ts", routeDest);
    added.push(path.relative(projectDir, routeDest));
  }

  return added;
}

function resolveIntegrationOutcome(input: {
  projectDir: string;
  layoutDetection: ReturnType<typeof detectChatSdkLayout>;
}): Pick<
  AdapterIntegrationResult,
  | "bridgeFilesAdded"
  | "integrationMode"
  | "botFilePatched"
  | "duplicateNovuModuleDetected"
  | "bridgeWired"
  | "needsAgentFollowUp"
> {
  const { layout } = input.layoutDetection;

  if (layout.mode === "merge-existing") {
    const patchResult = patchExistingBot(layout.botFile);
    const botFilePatched =
      patchResult.patched || patchResult.alreadyWired
        ? path.relative(input.projectDir, patchResult.botFile)
        : undefined;
    const bridgeWired = patchResult.patched || patchResult.alreadyWired;
    const needsAgentFollowUp =
      input.layoutDetection.duplicateNovuModuleDetected ||
      !bridgeWired ||
      patchResult.reason !== undefined;

    return {
      bridgeFilesAdded: [],
      integrationMode: "merged-existing-bot",
      botFilePatched,
      duplicateNovuModuleDetected:
        input.layoutDetection.duplicateNovuModuleDetected,
      bridgeWired,
      needsAgentFollowUp,
    };
  }

  if (layout.mode === "scaffold-novu-module") {
    const bridgeFilesAdded = scaffoldNovuModuleFiles(input.projectDir);
    const bridgeWired = bridgeFilesAdded.length > 0;

    return {
      bridgeFilesAdded,
      integrationMode: "scaffolded-novu-module",
      duplicateNovuModuleDetected:
        input.layoutDetection.duplicateNovuModuleDetected,
      bridgeWired,
      needsAgentFollowUp:
        !bridgeWired || input.layoutDetection.duplicateNovuModuleDetected,
    };
  }

  return {
    bridgeFilesAdded: [],
    integrationMode: "skill-only",
    duplicateNovuModuleDetected:
      input.layoutDetection.duplicateNovuModuleDetected,
    bridgeWired: false,
    needsAgentFollowUp: true,
  };
}

export async function runChatSdkAdapterIntegration(
  input: AdapterIntegrationInput,
): Promise<AdapterIntegrationResult> {
  const projectDir = path.resolve(input.projectDir);
  const pkg = readPackageJson(projectDir);
  const packageManager = detectProjectPackageManager(projectDir);
  const layoutDetection = detectChatSdkLayout(projectDir);

  const merge = mergeEnvLocal({
    projectDir,
    secretKey: input.secretKey,
    agentIdentifier: input.agentIdentifier,
    apiBaseUrl: input.apiBaseUrl,
    overwriteSecretKey: input.overwriteSecretKey,
  });

  let adapterInstalled = false;
  if (pkg && !hasDependency(pkg, ADAPTER_PACKAGE)) {
    await installPackages(packageManager, [ADAPTER_PACKAGE], {
      cwd: projectDir,
      silent: input.silent,
    });
    adapterInstalled = true;
  }

  const skillHosts = resolveSkillHosts(projectDir);
  const { installed: skillsInstalled } = installSkills(projectDir, skillHosts);
  const integrationOutcome = resolveIntegrationOutcome({
    projectDir,
    layoutDetection,
  });

  return {
    envPath: merge.envPath,
    updatedKeys: merge.updatedKeys,
    adapterInstalled,
    skillsInstalled: skillsInstalled.filter(
      (skill) => skill.name === "novu-chat-sdk",
    ),
    bridgeRoute: BRIDGE_ROUTE,
    ...integrationOutcome,
  };
}
