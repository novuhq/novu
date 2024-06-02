const fs = require('fs');
const path = require('path');

const prePopulateEnv = (apps, folderBasePath, exampleEnvFilePath = 'src/.example.env', envFilePath = 'src/.env') => {
  console.log(`Pre-populating .env files from .example.env for [${apps.join(',')}]`);
  for (const folder of apps) {
    const exists = fs.existsSync(path.resolve(`${folderBasePath}/${folder}/${envFilePath}`));
    if (!exists) {
      console.log(`Populating ${folderBasePath}/${folder} with .env file`);
      fs.copyFileSync(
        path.resolve(`${folderBasePath}/${folder}/${exampleEnvFilePath}`),
        path.resolve(`${folderBasePath}/${folder}/${envFilePath}`)
      );
    }
  }
};

(async () => {
  const appsBasePath = `${__dirname}/../apps`;
  console.log('----------------------------------------');
  prePopulateEnv(['api', 'ws', 'worker'], appsBasePath);
  prePopulateEnv(['web', 'widget'], appsBasePath, '.example.env', '.env');
  console.log('Finished populating .env files');
  console.log('----------------------------------------');
})();
