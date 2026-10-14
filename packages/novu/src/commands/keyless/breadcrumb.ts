import fs from 'node:fs';
import path from 'node:path';

export type KeylessBreadcrumb = {
  environmentId: string;
  applicationIdentifier: string;
  apiUrl: string;
  claimUrl: string;
  expiresAt: string;
  createdAt: string;
};

const BREADCRUMB_DIR = '.novu';
const BREADCRUMB_FILE = 'keyless.json';
const GITIGNORE_ENTRY = `${BREADCRUMB_DIR}/`;

function getBreadcrumbPath(cwd: string): string {
  return path.join(cwd, BREADCRUMB_DIR, BREADCRUMB_FILE);
}

export function readKeylessBreadcrumb(cwd: string): KeylessBreadcrumb | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(getBreadcrumbPath(cwd), 'utf8')) as Partial<KeylessBreadcrumb>;

    return typeof parsed?.claimUrl === 'string' ? (parsed as KeylessBreadcrumb) : null;
  } catch {
    return null;
  }
}

/** The claim URL is credential-equivalent, so the breadcrumb must stay out of git; it never holds the secret key. */
export function writeKeylessBreadcrumb(cwd: string, breadcrumb: KeylessBreadcrumb): void {
  const filePath = getBreadcrumbPath(cwd);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(breadcrumb, null, 2)}\n`);
  ignoreBreadcrumbDir(cwd);
}

function ignoreBreadcrumbDir(cwd: string): void {
  const gitignorePath = path.join(cwd, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return;
  }

  const content = fs.readFileSync(gitignorePath, 'utf8');
  const alreadyIgnored = content
    .split('\n')
    .map((line) => line.trim())
    .some((line) => line === BREADCRUMB_DIR || line === GITIGNORE_ENTRY || line === `/${GITIGNORE_ENTRY}`);

  if (alreadyIgnored) {
    return;
  }

  const separator = content.length === 0 || content.endsWith('\n') ? '' : '\n';
  fs.appendFileSync(gitignorePath, `${separator}${GITIGNORE_ENTRY}\n`);
}
