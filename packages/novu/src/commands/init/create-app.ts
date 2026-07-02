import fs from 'fs';
import path from 'path';
import { bold, cyan, dim, green } from 'picocolors';
import type { RepoInfo } from './helpers/examples';
import type { PackageManager } from './helpers/get-pkg-manager';
import { tryGitInit } from './helpers/git';
import { isFolderEmpty } from './helpers/is-folder-empty';
import { getOnline } from './helpers/is-online';
import { isWriteable } from './helpers/is-writeable';

import type { TemplateMode, TemplateType } from './templates';
import { installTemplate, TemplateTypeEnum } from './templates';

export class DownloadError extends Error {}

export async function createApp({
  appPath,
  packageManager,
  templateChoice,
  typescript,
  eslint,
  srcDir,
  importAlias,
  secretKey,
  apiUrl,
  applicationId,
  userId,
  agentIdentifier,
}: {
  appPath: string;
  packageManager: PackageManager;
  templateChoice: string;
  typescript: boolean;
  eslint: boolean;
  srcDir: boolean;
  importAlias: string;
  secretKey: string;
  apiUrl: string;
  applicationId: string;
  userId: string;
  agentIdentifier?: string;
}): Promise<void> {
  let repoInfo: RepoInfo | undefined;
  const mode: TemplateMode = typescript ? 'ts' : 'js';
  const template: TemplateType =
    templateChoice === 'agent' ? 'app-agent' : templateChoice === 'chat-sdk' ? 'app-chat-sdk' : 'app-react-email';

  const root = path.resolve(appPath);

  if (!(await isWriteable(path.dirname(root)))) {
    console.error('The application path is not writable, please check folder permissions and try again.');
    console.error('It is likely you do not have write permissions for this folder.');
    process.exit(1);
  }

  const appName = path.basename(root);

  fs.mkdirSync(root, { recursive: true });
  if (!isFolderEmpty(root, appName)) {
    process.exit(1);
  }

  const useYarn = packageManager === 'yarn';
  const isOnline = !useYarn || (await getOnline());
  const originalDirectory = process.cwd();

  console.log(`Creating a new Novu app in ${green(root)}.`);
  console.log();

  process.chdir(root);

  /**
   * If an example repository is not provided for cloning, proceed
   * by installing from a template.
   */
  await installTemplate({
    appName,
    root,
    template,
    mode,
    packageManager,
    isOnline,
    eslint,
    srcDir,
    importAlias,
    secretKey,
    apiUrl,
    applicationId,
    userId,
    agentIdentifier,
  });

  if (tryGitInit(root)) {
    console.log('Initialized a git repository.');
    console.log();
  }

  let cdPath: string;
  if (path.join(originalDirectory, appName) === appPath) {
    cdPath = appName;
  } else {
    cdPath = appPath;
  }

  console.log(`${green('Success!')} Created ${appName} at ${appPath}`);
  printNextSteps({ template, cdPath, root, agentIdentifier, skipCd: appPath === originalDirectory });
}

function terminalLink(text: string, url: string): string {
  return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
}

function printNextSteps({
  template,
  cdPath,
  root,
  agentIdentifier,
  skipCd,
}: {
  template: TemplateType;
  cdPath: string;
  root: string;
  agentIdentifier?: string;
  skipCd: boolean;
}): void {
  const isAgent = template === TemplateTypeEnum.APP_AGENT;
  const isChatSdk = template === TemplateTypeEnum.APP_CHAT_SDK;

  if (isAgent) {
    const cmd = skipCd ? 'npm run dev:novu' : `cd ${cdPath} && npm run dev:novu`;
    const cmdLine = `$ ${cmd}`;
    const innerWidth = Math.max(cmdLine.length + 4, 50);

    const agentFileName = agentIdentifier ? `${agentIdentifier}.tsx` : 'support-agent.tsx';
    const agentFilePath = path.join(root, 'app', 'novu', 'agents', agentFileName);
    const agentRelPath = `app/novu/agents/${agentFileName}`;
    const fileUrl = `file://${agentFilePath}`;

    console.log();
    console.log(dim(`  ╭${'─'.repeat(innerWidth)}╮`));
    console.log(dim(`  │${' '.repeat(innerWidth)}│`));
    console.log(dim('  │') + `  ${cyan(cmdLine)}${' '.repeat(innerWidth - cmdLine.length - 2)}` + dim('│'));
    console.log(dim(`  │${' '.repeat(innerWidth)}│`));
    console.log(dim(`  ╰${'─'.repeat(innerWidth)}╯`));
    console.log();
    console.log(`  Send a message from your chat provider — your agent will reply.`);
    console.log();
    console.log(`  ${dim('npm run dev')}        ${dim('Start app without tunnel')}`);
    console.log(`  ${dim('npm run dev:novu')}   ${dim('Start app + dev tunnel')}`);
    console.log();
    console.log(`  ${dim('Your agent')}  ${cyan(terminalLink(agentRelPath, fileUrl))}`);
    console.log(`  ${dim('Docs')}        ${cyan('https://docs.novu.co/agents/overview')}`);
    console.log();
  } else if (isChatSdk) {
    const cmd = skipCd ? 'npm run dev:novu' : `cd ${cdPath} && npm run dev:novu`;
    const cmdLine = `$ ${cmd}`;
    const innerWidth = Math.max(cmdLine.length + 4, 50);

    console.log();
    console.log(dim(`  ╭${'─'.repeat(innerWidth)}╮`));
    console.log(dim(`  │${' '.repeat(innerWidth)}│`));
    console.log(dim('  │') + `  ${cyan(cmdLine)}${' '.repeat(innerWidth - cmdLine.length - 2)}` + dim('│'));
    console.log(dim(`  │${' '.repeat(innerWidth)}│`));
    console.log(dim(`  ╰${'─'.repeat(innerWidth)}╯`));
    console.log();
    console.log(`  Send a message from your connected channel — your bot will reply.`);
    console.log();
    console.log(`  ${dim('npm run dev')}        ${dim('Start app without tunnel')}`);
    console.log(`  ${dim('npm run dev:novu')}   ${dim('Start app + dev tunnel')}`);
    console.log();
    console.log(`  ${dim('Bridge')}      ${cyan('POST /api/webhooks/novu')}`);
    console.log(`  ${dim('Docs')}        ${cyan('https://docs.novu.co/agents/overview')}`);
    console.log();
  } else {
    console.log();
    console.log(bold('Next steps:'));
    console.log();

    let step = 1;
    if (!skipCd) {
      console.log(`  ${step}. ${cyan(`cd ${cdPath}`)}`);
      step += 1;
    }
    console.log(`  ${step}. ${cyan('npm run dev')}${dim('                          Start your app on :4000')}`);
    step += 1;
    console.log(`  ${step}. In a second terminal, run:`);
    console.log(`     ${cyan('npx novu@latest dev')}`);
    console.log(`     ${dim('Starts Novu Studio and a dev tunnel')}`);
    console.log();
    console.log(`  Edit ${cyan('app/novu/workflows/')} to customize your notification workflows.`);
    console.log(`  Docs: ${cyan('https://docs.novu.co/framework/introduction')}`);
    console.log();
  }
}
