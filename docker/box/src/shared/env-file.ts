// `KEY=value` lines of an env file (image/config/box.env, docker/box/.env, ~/.config/novu-box/*.env); the rest is
// ignored. The caller reads the file.
export function parseEnvFile(text: string): Record<string, string> {
  return Object.fromEntries(
    text.split('\n').flatMap((line) => {
      const [, key, value] = line.match(/^([A-Z0-9_]+)=(.*)$/) ?? [];

      return key === undefined ? [] : [[key, value ?? '']];
    })
  );
}
