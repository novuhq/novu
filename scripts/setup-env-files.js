const fs = require('fs');

(async () => {
  const apps = ['api', 'ws'];

  console.log('----------------------------------------');
  console.log('Pre-populating .env files from .example.env');

  for (const app of apps) {
    const exists = fs.existsSync(`${__dirname}/../apps/${app}/src/.env`);

    if (!exists) {
      console.log(`Populating ${app} with .env file`);
      fs.copyFileSync(`${__dirname}/../apps/${app}/src/.example.env`, `${__dirname}/../apps/${app}/src/.env`);
    }
  }

  console.log('Finished populating .env files');
  console.log('----------------------------------------');
})();
