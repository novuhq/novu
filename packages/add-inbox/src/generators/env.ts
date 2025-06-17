import { ENV_VARIABLES } from '../constants';
import fileUtils, { updateEnvVariable } from '../utils/file';
import logger from '../utils/logger';
import { getEnvironmentVariableName } from './react-version';

export function setupEnvExampleNextJs(updateExisting: boolean, appId: string | null = null): void {
  // Validate appId to prevent injection
  if (appId && (appId.includes('\n') || appId.includes('\r'))) {
    throw new Error('Invalid appId: cannot contain newline characters');
  }

  logger.gray('• Setting up environment configuration for Next.js...');
  const envExamplePath = fileUtils.joinPaths(process.cwd(), '.env.example');
  const envLocalPath = fileUtils.joinPaths(process.cwd(), '.env.local');

  // Validate appId: allow only alphanumeric and dashes
  const safeAppId = typeof appId === 'string' && /^[a-zA-Z0-9-]+$/.test(appId) ? appId : '';

  // For .env.example, always use empty value
  const envExampleContent = `\n# Novu configuration (added by Novu Inbox Installer)
${ENV_VARIABLES.NEXTJS.APP_ID}=
`;

  // For .env.local, use provided appId if available
  const envLocalContent = `\n# Novu configuration (added by Novu Inbox Installer)
${ENV_VARIABLES.NEXTJS.APP_ID}=${safeAppId}
`;

  // Handle .env.example
  if (fileUtils.exists(envExamplePath)) {
    const existingContent = fileUtils.readFile(envExamplePath);
    if (existingContent?.includes(ENV_VARIABLES.NEXTJS.APP_ID)) {
      logger.blue('  • Novu variables already detected in .env.example. No changes made.');
    } else if (updateExisting) {
      fileUtils.appendFile(envExamplePath, envExampleContent);
      logger.blue('  • Appended Novu configuration to existing .env.example');
    } else {
      logger.warning(
        '  • .env.example exists. Skipping modification as Novu variables were not found and appending was not confirmed.'
      );
      logger.cyan('    Please manually add Novu variables to your .env.example:');
      logger.cyan(`    ${ENV_VARIABLES.NEXTJS.APP_ID}=`);
    }
  } else {
    fileUtils.writeFile(envExamplePath, envExampleContent.trimStart());
    logger.blue('  • Created .env.example with Novu configuration');
  }

  // Handle .env.local
  if (fileUtils.exists(envLocalPath)) {
    const existingContent = fileUtils.readFile(envLocalPath);
    if (existingContent?.includes(ENV_VARIABLES.NEXTJS.APP_ID)) {
      // Update only the Novu variable, preserve other content
      const updatedContent = updateEnvVariable(existingContent, ENV_VARIABLES.NEXTJS.APP_ID, safeAppId);
      fileUtils.writeFile(envLocalPath, updatedContent);
      logger.blue('  • Updated Novu configuration in .env.local');
    } else {
      fileUtils.appendFile(envLocalPath, envLocalContent);
      logger.blue('  • Added Novu configuration to existing .env.local');
    }
  } else {
    fileUtils.writeFile(envLocalPath, envLocalContent.trimStart());
    logger.blue('  • Created .env.local with Novu configuration');
  }

  logger.gray('    Remember to fill in your Novu credentials in .env.local.');
  logger.gray('    Ensure .env.local is in your .gitignore file.');
}

export function setupEnvExampleReact(updateExisting: boolean, appId: string | null = null): void {
  logger.gray('• Setting up environment configuration for React...');
  const envPath = fileUtils.joinPaths(process.cwd(), '.env.example');
  const envLocalPath = fileUtils.joinPaths(process.cwd(), '.env');

  // Get the appropriate environment variable name based on React version
  const envVarName = getEnvironmentVariableName();

  // Validate appId: allow only alphanumeric and dashes
  const safeAppId = typeof appId === 'string' && /^[a-zA-Z0-9-]+$/.test(appId) ? appId : '';

  // For .env.example, always use empty value
  const envExampleContent = `\n# Novu configuration (added by Novu Inbox Installer)
${envVarName}=
`;

  // For .env, use provided appId if available
  const envContent = `\n# Novu configuration (added by Novu Inbox Installer)
${envVarName}=${safeAppId}
`;

  if (fileUtils.exists(envPath)) {
    const existingContent = fileUtils.readFile(envPath);
    if (existingContent?.includes(envVarName)) {
      logger.blue('  • Novu variables already detected in .env.example. No changes made.');
    } else if (updateExisting) {
      fileUtils.appendFile(envPath, envExampleContent);
      logger.blue('  • Appended Novu configuration to existing .env.example');
    } else {
      logger.warning(
        '  • .env.example exists. Skipping modification as Novu variables were not found and appending was not confirmed.'
      );
      logger.cyan('    Please manually add Novu variables to your .env.example:');
      logger.cyan(`    ${envVarName}=`);
    }
  } else {
    fileUtils.writeFile(envPath, envExampleContent.trimStart());
    logger.blue('  • Created .env.example with Novu configuration');
  }

  // Handle .env
  if (fileUtils.exists(envLocalPath)) {
    const existingContent = fileUtils.readFile(envLocalPath);
    if (existingContent?.includes(envVarName)) {
      // Update only the Novu variable, preserve other content
      const updatedContent = updateEnvVariable(existingContent, envVarName, safeAppId);
      fileUtils.writeFile(envLocalPath, updatedContent);
      logger.blue('  • Updated Novu configuration in .env');
    } else {
      fileUtils.appendFile(envLocalPath, envContent);
      logger.blue('  • Added Novu configuration to existing .env');
    }
  } else {
    fileUtils.writeFile(envLocalPath, envContent.trimStart());
    logger.blue('  • Created .env with Novu configuration');
  }

  logger.gray('    Remember to fill in your Novu credentials in .env.');
  logger.gray('    Ensure .env is in your .gitignore file.');
}
