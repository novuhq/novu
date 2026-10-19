# Devtool

`devtool.ts`, `schema_output.json` and `schema_input.json` is meant to be used to extract json schema object from openapi json.
Put you openapi json in `schema_input.json` and change line 9 in `devtool.ts` to the path where the schema object you need are located. run `npm run devtool` and open `schema_output.json` and copy the result from there.
