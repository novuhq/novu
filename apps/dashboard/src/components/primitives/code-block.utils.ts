export type SecretMask = {
  line: number;
  maskStart?: number;
  maskEnd?: number;
};

export function applySecretMask(
  code: string | undefined,
  secretMask: SecretMask[] | undefined,
  showSecrets: boolean
): string {
  const source = code ?? '';

  if (showSecrets || !secretMask?.length) {
    return source;
  }

  const lines = source.split('\n');

  for (const mask of secretMask) {
    const lineIndex = (mask?.line ?? 0) - 1;

    if (lineIndex < 0 || lineIndex >= lines.length) {
      continue;
    }

    const lineContent = lines[lineIndex];

    if (typeof lineContent !== 'string') {
      continue;
    }

    const { maskStart, maskEnd } = mask;

    if (maskStart !== undefined && maskEnd !== undefined) {
      const start = Math.max(0, Math.min(maskStart, lineContent.length));
      const end = Math.max(start, Math.min(maskEnd, lineContent.length));

      lines[lineIndex] = lineContent.substring(0, start) + '•'.repeat(end - start) + lineContent.substring(end);
    } else {
      lines[lineIndex] = '•'.repeat(lineContent.length);
    }
  }

  return lines.join('\n');
}
