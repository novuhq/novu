import { IFramework } from '../config/framework';
import { FRAMEWORKS, FrameworkType } from '../constants';
import fileUtils from '../utils/file';
import logger from '../utils/logger';
import { generateNextJsComponent } from './frameworks/nextjs';
import { generateLegacyReactComponent, generateModernReactComponent } from './frameworks/react';
import { isModernReact } from './react-version';

export async function createComponentStructure(
  framework: IFramework,
  overwriteComponents: boolean,
  subscriberId: string | null | undefined,
  region: 'us' | 'eu' = 'us',
  backendUrl: string | null = null,
  socketUrl: string | null = null
): Promise<void> {
  logger.gray('• Creating component structure...');

  const cwd = process.cwd();
  const srcDir = fileUtils.joinPaths(cwd, 'src');
  const appDir = fileUtils.joinPaths(cwd, 'app');

  // Determine the base directory for components
  let baseDir = cwd;
  if (fileUtils.exists(srcDir)) {
    baseDir = srcDir;
  } else if (fileUtils.exists(appDir)) {
    baseDir = appDir;
  }

  const componentsDir = fileUtils.joinPaths(baseDir, 'components');
  const uiDir = fileUtils.joinPaths(componentsDir, 'ui');
  const inboxDir = fileUtils.joinPaths(uiDir, 'inbox');

  // Create directories if they don't exist
  fileUtils.createDirectory(componentsDir);
  fileUtils.createDirectory(uiDir);
  fileUtils.createDirectory(inboxDir);

  // Generate component code based on framework
  let componentCode: string;
  if (framework.framework === FRAMEWORKS.NEXTJS) {
    componentCode = generateNextJsComponent(subscriberId || null, region as 'us' | 'eu', backendUrl, socketUrl);
  } else if (isModernReact()) {
    componentCode = generateModernReactComponent(subscriberId || null, region, backendUrl, socketUrl);
  } else {
    componentCode = generateLegacyReactComponent(subscriberId || null, region, backendUrl, socketUrl);
  }

  // Write component file
  const componentPath = fileUtils.joinPaths(inboxDir, 'NovuInbox.tsx');

  const fileExists = fileUtils.exists(componentPath);
  if (fileExists && !overwriteComponents) {
    logger.warning(`Component already exists at ${componentPath}. Use --overwrite to replace it.`);

    return;
  }

  try {
    fileUtils.writeFile(componentPath, componentCode);
    logger.success('  ✓ Created Novu Inbox component');
    logger.gray(`    Location: ${componentPath}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(`Failed to create component file: ${error.message}`);
    } else {
      logger.error('Failed to create component file: Unknown error');
    }
    throw error;
  }
}
