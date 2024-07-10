import * as fs from 'fs';
import { format } from 'date-fns';

const backupFolder = `${__dirname}/backups`;

export async function makeJsonBackup(folder: string, fileName: string, obj: unknown) {
  try {
    const fullFolderPath = `${backupFolder}/${folder}`;
    if (!fs.existsSync(fullFolderPath)) {
      await fs.promises.mkdir(fullFolderPath, { recursive: true });
    }

    const dateString = format(new Date(), 'yyyy-MM-dd:HH:mm:ss:SSS');
    const fullFileName = `${dateString}_${fileName}`;
    await fs.promises.writeFile(`${fullFolderPath}/${fullFileName}.json`, JSON.stringify(obj));
    console.log(`The backup JSON was written to file ${fullFileName}`);
  } catch (e) {
    console.error('Error writing backup JSON to file:', e);
  }
}
