import fs from 'fs';
import path from 'path';

interface FileUtils {
  exists: (filePath: string) => boolean;
  readJson: (filePath: string) => any;
  writeJson: (filePath: string, data: any) => void;
  readFile: (filePath: string) => string | null;
  writeFile: (filePath: string, content: string) => void;
  appendFile: (filePath: string, content: string) => void;
  createDirectory: (dirPath: string) => void;
  removeDirectory: (dirPath: string) => void;
  joinPaths: (...paths: string[]) => string;
  copyFile: (sourcePath: string, targetPath: string) => void;
  deleteFile: (filePath: string) => void;
}

const fileUtils: FileUtils = {
  exists: (filePath) => fs.existsSync(filePath),

  readJson: (filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  },

  writeJson: (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  },

  readFile: (filePath) => {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      return null;
    }
  },

  writeFile: (filePath, content) => {
    fs.writeFileSync(filePath, content);
  },

  appendFile: (filePath, content) => {
    fs.appendFileSync(filePath, content);
  },

  createDirectory: (dirPath) => {
    fs.mkdirSync(dirPath, { recursive: true });
  },

  removeDirectory: (dirPath) => {
    fs.rmSync(dirPath, { recursive: true, force: true });
  },

  joinPaths: (...paths) => path.join(...paths),

  copyFile: (sourcePath, targetPath) => {
    fs.copyFileSync(sourcePath, targetPath);
  },

  deleteFile: (filePath) => {
    fs.unlinkSync(filePath);
  },
};

export default fileUtils;
