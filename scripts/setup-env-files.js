const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ENCRYPTION_KEY_PLACEHOLDER = '<ENCRYPTION_KEY_MUST_BE_32_LONG>';

const generateEncryptionKey = () => crypto.randomBytes(16).toString('hex');

const prePopulateEnv = (apps, folderBasePath, exampleEnvFilePath = 'src/.example.env', envFilePath = 'src/.env', sharedEncryptionKey) => {
  console.log(`Pre-populating .env files from .example.env for [${apps.join(',')}]`);
  for (const folder of apps) {
    const destPath = path.resolve(`${folderBasePath}/${folder}/${envFilePath}`);
    const exists = fs.existsSync(destPath);
    if (!exists) {
      console.log(`Populating ${folderBasePath}/${folder} with .env file`);
      const sourcePath = path.resolve(`${folderBasePath}/${folder}/${exampleEnvFilePath}`);
      let content = fs.readFileSync(sourcePath, 'utf8');
      if (content.includes(ENCRYPTION_KEY_PLACEHOLDER) && sharedEncryptionKey) {
        content = content.replaceAll(ENCRYPTION_KEY_PLACEHOLDER, sharedEncryptionKey);
        console.log(`  Generated STORE_ENCRYPTION_KEY for ${folder}`);
      }
      fs.writeFileSync(destPath, content);
    }
  }
};

(async () => {
  const appsBasePath = `${__dirname}/../apps`;
  const sharedEncryptionKey = generateEncryptionKey();
  console.log('----------------------------------------');
  prePopulateEnv(['api', 'ws', 'worker'], appsBasePath, 'src/.example.env', 'src/.env', sharedEncryptionKey);
  prePopulateEnv(['dashboard'], appsBasePath, '.example.env', '.env', sharedEncryptionKey);
  console.log('Finished populating .env files');
  console.log('----------------------------------------');
})();
