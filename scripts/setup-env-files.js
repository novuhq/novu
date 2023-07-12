const fs = require('fs');
const path = require('path');

const prePopulateEnv = (folders, folderBasePath, exampleEnvFilePath = 'src/.example.env', envFilePath = 'src/.env') => {
  for (const folder of folders) {
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
  const apps = ['api', 'ws', 'worker'];
  const appsBasePath = `${__dirname}/../apps`;

  console.log('----------------------------------------');
  console.log('Pre-populating .env files from .example.env');

  prePopulateEnv(apps, appsBasePath);

  console.log('Finished populating .env files');
  console.log('----------------------------------------');
})();
