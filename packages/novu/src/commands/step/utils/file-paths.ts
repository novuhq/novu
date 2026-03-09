import * as fs from 'fs';
import * as path from 'path';

const STEP_FILE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

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

  findExistingStepFilePath(workflowId: string, stepId: string): string | undefined {
    const workflowDir = this.getWorkflowDir(workflowId);

    for (const ext of STEP_FILE_EXTENSIONS) {
      const candidate = path.join(workflowDir, `${stepId}.step${ext}`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return undefined;
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
