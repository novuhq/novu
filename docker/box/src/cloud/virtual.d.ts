// `import source from './thin.ts?worker'`: Alchemy bundles the file into one module and imports it as a string.
declare module '*?worker' {
  const source: string;
  export default source;
}
