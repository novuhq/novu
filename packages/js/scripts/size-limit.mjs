import fs from 'fs/promises';
import path from 'path';
import bytes from 'bytes-iec';
import chalk from 'chalk';

const baseDir = process.cwd();
const umdPath = path.resolve(baseDir, './dist/novu.min.js');
const umdGzipPath = path.resolve(baseDir, './dist/novu.min.js.gz');

const formatBytes = (size) => {
  return bytes.format(size, { unitSeparator: ' ' });
};

const modules = [
  {
    name: 'UMD minified',
    filePath: umdPath,
    limitInBytes: 145_000,
  },
  {
    name: 'UMD gzip',
    filePath: umdGzipPath,
    limitInBytes: 50_000,
  },
];

const checkFiles = async () => {
  const result = [];
  for (const module of modules) {
    const { name, filePath, limitInBytes } = module;
    const stats = await fs.stat(filePath);
    const passed = stats.size <= limitInBytes;
    result.push({ name, passed, size: formatBytes(stats.size), limit: formatBytes(limitInBytes) });
  }

  return result;
};

const calculateSizes = async () => {
  console.log(chalk.gray('🚧 Checking the build dist files...\n'));

  const checks = await checkFiles();
  const anyFailed = checks.some((check) => !check.passed);

  checks.forEach((check) => {
    const { name, passed, size, limit } = check;

    if (!passed) {
      console.log(chalk.yellow(`The ${name} file has failed the size limit.`));
      console.log(chalk.yellow(`Current size is "${size}" and the limit is "${limit}".\n`));
    } else {
      console.log(chalk.green(`The ${name} file has passed the size limit.`));
      console.log(chalk.green(`Current size is "${size}" and the limit is "${limit}".\n`));
    }
  });

  if (anyFailed) {
    console.log(chalk.bold.red('\nThe build has reached the dist files size limits! 🚨\n'));

    process.exit(1);
  } else {
    console.log(chalk.green('All good! 🙌'));
  }
};

calculateSizes();
