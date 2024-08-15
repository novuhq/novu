import fs from 'node:fs';
import path from 'node:path';

const metadataPath = path.join(__dirname, '..', 'src', 'metadata.ts');

/*
 * We create an empty metadata file to ensure that files importing `metadata.ts`
 * will compile successfully before the metadata generation occurs.
 */
const defaultContent = `export default async () => { return {}; };`;

fs.writeFileSync(metadataPath, defaultContent, 'utf8');
console.log('metadata.ts file has been generated with default content.');
