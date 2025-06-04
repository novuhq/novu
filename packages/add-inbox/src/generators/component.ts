import { FRAMEWORKS, FrameworkType } from '../constants';
import fileUtils from '../utils/file';
import logger from '../utils/logger';
import { generateNextJsComponent } from './frameworks/nextjs';
import { generateModernReactComponent, generateLegacyReactComponent } from './frameworks/react';
import { isModernReact } from './react-version';
import { Framework } from '../config/framework';

export async function createComponentStructure(
  framework: Framework,
  overwriteComponents: boolean,
  subscriberId: string | null | undefined,
  region: string = 'us'
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
    componentCode = generateNextJsComponent(subscriberId || null, region);
  } else {
    // For React, determine if it's modern or legacy
    if (isModernReact()) {
      componentCode = generateModernReactComponent(subscriberId || null, region);
    } else {
      componentCode = generateLegacyReactComponent(subscriberId || null, region);
    }
  }

  // Write component file
  const componentPath = fileUtils.joinPaths(inboxDir, 'NovuInbox.tsx');
  fileUtils.writeFile(componentPath, componentCode);

  logger.success('  ✓ Created Novu Inbox component');
  logger.gray(`    Location: ${componentPath}`);
}
