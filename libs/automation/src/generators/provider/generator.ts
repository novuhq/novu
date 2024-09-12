import { addProjectConfiguration, formatFiles, generateFiles, Tree } from '@nx/devkit';
import fs from 'node:fs';
import path from 'node:path';
// eslint-disable-next-line import/extensions
import { IProviderGeneratorSchema } from './schema';

const PROVIDERS_BASE_FOLDER = path.join('..', '..', 'packages', 'providers', 'src', 'lib');

export async function providerGenerator(tree: Tree, options: IProviderGeneratorSchema) {
  // eslint-disable-next-line no-param-reassign
  options = enrichOptionsWithMultipleCases(options);
  const providerNameInKebabCase = options.name;
  const providerInnerFolder = path.join(PROVIDERS_BASE_FOLDER, options.type.toLowerCase(), providerNameInKebabCase);
  buildAndAddProjectConfiguration(tree, options, providerInnerFolder);
  generateFilesBasedOnTemplate(tree, providerInnerFolder, options);
  addExportToIndexTs(providerNameInKebabCase, options.type);
  removeDefaultProjectJsonFromTree(tree, providerInnerFolder);
  await formatFiles(tree);
}

function repopulateFileWithNewLine(filePath, lines: string[]) {
  fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8', (err) => {
    if (err) {
      console.error('Error writing to file:', err);

      return;
    }
    console.log('Line added successfully.');
  });
}

function addLineToFile(filePath, lineToAdd) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);

      return;
    }
    const lines = data.split('\n');
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop();
    }
    lines.push(lineToAdd);

    // Write the updated content back to the file
    repopulateFileWithNewLine(filePath, lines);
  });
}

function toPascalCase(kebabString) {
  return kebabString
    .toLowerCase()
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}
function enrichOptionsWithMultipleCases(options: IProviderGeneratorSchema) {
  return {
    ...options,
    pascalType: toPascalCase(options.type),
    pascalName: toPascalCase(options.name),
    upperType: options.type.toUpperCase(),
  };
}

function buildAndAddProjectConfiguration(tree: Tree, options: IProviderGeneratorSchema, projectRoot: string) {
  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'library',
    sourceRoot: projectRoot,
    targets: {},
  });
}

function buildExportLine(providerName: string) {
  return `export * from './${providerName}/${providerName}.provider';`;
}

function addExportToIndexTs(providerName: string, type: string) {
  const indexTsPath = path.join(PROVIDERS_BASE_FOLDER, type.toLowerCase(), 'index.ts');
  addLineToFile(indexTsPath, buildExportLine(providerName));
}

function removeDefaultProjectJsonFromTree(tree: Tree, projectRoot: string) {
  tree.delete(`${projectRoot}/project.json`);
}

function generateFilesBasedOnTemplate(tree: Tree, projectRoot: string, options: IProviderGeneratorSchema) {
  generateFiles(tree, path.join(__dirname, 'files'), projectRoot, options);
}
export default providerGenerator;
