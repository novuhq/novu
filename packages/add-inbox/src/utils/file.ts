import fs from 'fs';
import path from 'path';

interface FileUtils {
  exists: (filePath: string) => boolean;
  readJson: <T = unknown>(filePath: string) => T | null;
  writeJson: <T = unknown>(filePath: string, data: T) => boolean;
  readFile: (filePath: string) => string | null;
  writeFile: (filePath: string, content: string) => void;
  appendFile: (filePath: string, content: string) => void;
  createDirectory: (dirPath: string) => void;
  removeDirectory: (dirPath: string) => boolean;
  joinPaths: (...paths: string[]) => string;
  copyFile: (sourcePath: string, targetPath: string) => boolean;
  deleteFile: (filePath: string) => boolean;
}

const fileUtils: FileUtils = {
  exists: (filePath) => fs.existsSync(filePath),

  readJson: <T = unknown>(filePath: string): T | null => {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path provided');
    }

    // Prevent directory traversal attacks
    const resolvedPath = path.resolve(filePath);
    const basePath = process.cwd();
    if (!resolvedPath.startsWith(basePath)) {
      throw new Error('Access denied: Path outside working directory');
    }

    try {
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      console.warn(`Failed to read JSON from ${resolvedPath}:`, error);
      return null;
    }
  },

  writeJson: <T = unknown>(filePath: string, data: T): boolean => {
    const resolvedPath = path.resolve(filePath);
    const basePath = process.cwd();
    if (!resolvedPath.startsWith(basePath)) {
      throw new Error('Access denied: Path outside working directory');
    }
    try {
      fs.writeFileSync(resolvedPath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Failed to write JSON to ${resolvedPath}:`, error);
      return false;
    }
  },

  readFile: (filePath) => {
    const resolvedPath = path.resolve(filePath);
    const basePath = process.cwd();
    if (!resolvedPath.startsWith(basePath)) {
      throw new Error('Access denied: Path outside working directory');
    }
    try {
      return fs.readFileSync(resolvedPath, 'utf-8');
    } catch (error) {
      return null;
    }
  },

  writeFile: (filePath, content) => {
    const resolvedPath = path.resolve(filePath);
    const basePath = process.cwd();
    if (!resolvedPath.startsWith(basePath)) {
      throw new Error('Access denied: Path outside working directory');
    }
    try {
      fs.writeFileSync(resolvedPath, content);
    } catch (error) {
      console.error(`Failed to write file to ${resolvedPath}:`, error);
      throw error;
    }
  },

  appendFile: (filePath, content) => {
    const resolvedPath = path.resolve(filePath);
    const basePath = process.cwd();
    if (!resolvedPath.startsWith(basePath)) {
      throw new Error('Access denied: Path outside working directory');
    }
    fs.appendFileSync(resolvedPath, content);
  },

  createDirectory: (dirPath) => {
    const resolvedPath = path.resolve(dirPath);
    const basePath = process.cwd();
    if (!resolvedPath.startsWith(basePath)) {
      throw new Error('Access denied: Path outside working directory');
    }
    fs.mkdirSync(resolvedPath, { recursive: true });
  },

  removeDirectory: (dirPath) => {
    const resolvedPath = path.resolve(dirPath);
    const basePath = process.cwd();
    if (!resolvedPath.startsWith(basePath)) {
      throw new Error('Access denied: Path outside working directory');
    }
    if (!fs.existsSync(resolvedPath)) {
      return false;
    }

    try {
      fs.rmSync(resolvedPath, { recursive: true, force: false });
      return true;
    } catch (error) {
      console.error(`Failed to remove directory ${resolvedPath}:`, error);
      return false;
    }
  },

  joinPaths: (...paths) => path.join(...paths),

  copyFile: (sourcePath, targetPath) => {
    const resolvedSource = path.resolve(sourcePath);
    const resolvedTarget = path.resolve(targetPath);
    const basePath = process.cwd();
    if (!resolvedSource.startsWith(basePath) || !resolvedTarget.startsWith(basePath)) {
      throw new Error('Access denied: Path outside working directory');
    }
    try {
      if (!fs.existsSync(resolvedSource)) {
        console.error(`Source file does not exist: ${resolvedSource}`);
        return false;
      }
      fs.copyFileSync(resolvedSource, resolvedTarget);
      return true;
    } catch (error) {
      console.error(`Failed to copy file from ${resolvedSource} to ${resolvedTarget}:`, error);
      return false;
    }
  },

  deleteFile: (filePath) => {
    const resolvedPath = path.resolve(filePath);
    const basePath = process.cwd();
    if (!resolvedPath.startsWith(basePath)) {
      throw new Error('Access denied: Path outside working directory');
    }
    try {
      if (fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to delete file ${resolvedPath}:`, error);
      return false;
    }
  },
};

export default fileUtils;
