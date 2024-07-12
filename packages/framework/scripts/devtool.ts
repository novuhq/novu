import { writeFileSync } from 'fs';

import $RefParser from '@apidevtools/json-schema-ref-parser';

const main = async () => {
  const parser = new $RefParser();
  const schema = await parser.dereference(__dirname + '/input.json');
  // Edit this path to target the JSON schema that the send message endpoint uses
  const body = schema['components']['schemas']['api.v2010.account.message'];
  writeFileSync(__dirname + '/schema.json', JSON.stringify(body, null, 2));

  console.log('schema.json updated');
};

main();
