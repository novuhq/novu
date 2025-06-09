import fs from 'fs';
import path from 'path';

interface FileUtils {
  exists: (filePath: string) => boolean;
  readJson: (filePath: string) => any;
  writeJson: (filePath: string, data: any) => boolean;
  readFile: (filePath: string) => string | null;
  writeFile: (filePath: string, content: string) => void;
  appendFile: (filePath: string, content: string) => void;
  createDirectory: (dirPath: string) => void;
  removeDirectory: (dirPath: string) => boolean;
  joinPaths: (...paths: string[]) => string;
  copyFile: (sourcePath: string, targetPath: string) => void;
  deleteFile: (filePath: string) => boolean;
}

const fileUtils: FileUtils = {
  exists: (filePath) => fs.existsSync(filePath),

  readJson: (filePath) => {
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
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Failed to read JSON from ${resolvedPath}:`, error);
      return null;
    }
  },

  writeJson: (filePath, data) => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Failed to write JSON to ${filePath}:`, error);
      return false;
    }
  },

  readFile: (filePath) => {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      return null;
    }
  },

  writeFile: (filePath, content) => {
    try {
      fs.writeFileSync(filePath, content);
      return true;
    } catch (error) {
      console.error(`Failed to write file to ${filePath}:`, error);
      return false;
    }
  },

  appendFile: (filePath, content) => {
    fs.appendFileSync(filePath, content);
  },

  createDirectory: (dirPath) => {
    fs.mkdirSync(dirPath, { recursive: true });
  },

  removeDirectory: (dirPath) => {
    if (!fs.existsSync(dirPath)) {
      return false;
    }

    try {
      fs.rmSync(dirPath, { recursive: true, force: false });
      return true;
    } catch (error) {
      console.error(`Failed to remove directory ${dirPath}:`, error);
      return false;
    }
  },

  joinPaths: (...paths) => path.join(...paths),

  copyFile: (sourcePath, targetPath) => {
    try {
      if (!fs.existsSync(sourcePath)) {
        console.error(`Source file does not exist: ${sourcePath}`);
        return false;
      }
      fs.copyFileSync(sourcePath, targetPath);
      return true;
    } catch (error) {
      console.error(`Failed to copy file from ${sourcePath} to ${targetPath}:`, error);
      return false;
    }
  },

  deleteFile: (filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
      return false;
    }
  },
};

export default fileUtils;
