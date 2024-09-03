import { writeFileSync } from 'node:fs';
import path from 'node:path';

import $RefParser from '@apidevtools/json-schema-ref-parser';

const main = async () => {
  const parser = new $RefParser();
  const schema = await parser.dereference(path.join(__dirname, 'schema_input.json'));
  // eslint-disable-next-line multiline-comment-style
  // Edit this path to target the JSON schema that the send message endpoint uses
  // @ts-expect-error - components does not exist on the schema
  const body = schema.components.schemas['api.v2010.account.message'];
  writeFileSync(path.join(__dirname, 'schema_output.json'), JSON.stringify(body, null, 2));

  console.log('schema.json updated');
};

main();
