import { promises as fs } from 'fs';
import path from 'path';
import { TranslationFile } from './types';

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export function extractLocaleFromFilename(filename: string): string | null {
  const match = filename.match(/^([a-z]{2}(?:_[A-Z]{2})?)\.json$/i);

  return match ? match[1] : null;
}

export function createFilenameFromLocale(locale: string): string {
  return `${locale}.json`;
}

export async function saveTranslationFile(
  directory: string,
  locale: string,
  content: Record<string, unknown>
): Promise<string> {
  await ensureDirectoryExists(directory);
  const filename = createFilenameFromLocale(locale);
  const filePath = path.join(directory, filename);

  await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');

  return filePath;
}

export async function loadTranslationFiles(directory: string): Promise<TranslationFile[]> {
  try {
    await fs.access(directory);
  } catch {
    throw new Error(`Directory not found: ${directory}`);
  }

  const files = await fs.readdir(directory);
  const translationFiles: TranslationFile[] = [];

  for (const file of files) {
    const locale = extractLocaleFromFilename(file);
    if (!locale) {
      console.warn(`Skipping file with invalid name format: ${file} (expected format: locale.json, e.g., en_US.json)`);
      continue;
    }

    const filePath = path.join(directory, file);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const parsedContent = JSON.parse(content);

      translationFiles.push({
        locale,
        filePath,
        content: parsedContent,
      });
    } catch (error) {
      console.warn(`Skipping invalid JSON file: ${file} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return translationFiles;
}

export function validateTranslationContent(content: unknown): boolean {
  return typeof content === 'object' && content !== null && !Array.isArray(content);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}
