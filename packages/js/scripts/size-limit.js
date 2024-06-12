import path from 'path';
import sizeLimit from 'size-limit';
import filePlugin from '@size-limit/file';
import esbuildPlugin from '@size-limit/esbuild';
import bytes from "bytes-iec"
import chalk from "chalk"

const LIMIT = '10 kb';
const LIMIT_IN_BYTES = 10_000;
const baseDir = process.cwd();
const esmPath = path.resolve(baseDir, './dist/index.js');
const cjsPath = path.resolve(baseDir, './dist/index.cjs');
const umdPath = path.resolve(baseDir, './dist/novu.min.js');

const formatBytes = (size) => {
  return bytes.format(size, { unitSeparator: " " })
}

const checks = [
  {
    name: 'ESM',
    path: esmPath,
    limit: LIMIT,
    files: [esmPath],
    sizeLimit: LIMIT_IN_BYTES,
  },
  {
    name: 'CJS',
    path: cjsPath,
    limit: LIMIT,
    files: [cjsPath],
    sizeLimit: LIMIT_IN_BYTES,
  },
  {
    name: 'UMD',
    path: umdPath,
    limit: LIMIT,
    files: [umdPath],
    sizeLimit: LIMIT_IN_BYTES,
  },
];

const config = {
  cwd: process.cwd(),
  checks,
};

const calculateSizes = async () => {
  console.log(chalk.gray("Checking the build dist files..."));

  const results = await sizeLimit([filePlugin, esbuildPlugin], config);
  if (config.failed) {
    console.log(chalk.bold.red("\nThe build has reached the dist files size limits! 🚨\n"));

    results.filter((_, index) => {
      const check = checks[index]
      const { passed } = check

      return !passed;
    }).forEach((result, index) => {
      const check = checks[index]
      const { size } = result
      const { name } = check

      console.log(chalk.yellow(`The ${name} file has failed the size limit.`));
      console.log(chalk.yellow(`Current size is "${formatBytes(size)}" and the limit is "${check.limit}".\n`));
    })

    process.exit(1);
  } else {
    console.log(chalk.green("All good! 🙌"));
  }
}

calculateSizes();
