import * as path from 'path';

export class StepFilePathResolver {
  constructor(
    private readonly rootDir: string,
    private readonly outDirPath: string
  ) {}

  getWorkflowDir(workflowId: string): string {
    return path.join(this.outDirPath, workflowId);
  }

  getStepFilePath(workflowId: string, stepId: string): string {
    return path.join(this.getWorkflowDir(workflowId), `${stepId}.step.tsx`);
  }

  getRelativeStepPath(workflowId: string, stepId: string): string {
    return path.relative(this.outDirPath, this.getStepFilePath(workflowId, stepId));
  }

  getTemplateImportPath(workflowId: string, templatePath: string): string {
    const workflowDir = this.getWorkflowDir(workflowId);
    const templateAbsPath = path.resolve(this.rootDir, templatePath);
    const relativeImportPath = path.relative(workflowDir, templateAbsPath);

    const importPath = relativeImportPath.replace(/\\/g, '/').replace(/\.(tsx?|jsx?)$/, '');

    return importPath.startsWith('.') ? importPath : `./${importPath}`;
  }
}
