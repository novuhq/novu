/**
 * Generates a Teams app package (.zip) in the browser without a server or extra dependencies.
 *
 * Contains: manifest.json (pre-filled), color.png (192x192), outline.png (32x32).
 * Uses store-only zip (no compression) since PNGs are already compressed and the JSON is tiny.
 */

import { buildZip } from '@/utils/build-zip';

function generateIconBlob(size: number, letter: string, style: 'color' | 'outline'): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const font = `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

  if (style === 'color') {
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.18);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.48}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, size / 2, size / 2 + size * 0.02);
  } else {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#6366f1';
    ctx.font = `bold ${size * 0.55}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, size / 2, size / 2 + size * 0.02);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function downloadTeamsAppPackage(manifestJson: string, agentName: string) {
  const letter = (agentName || 'N').charAt(0).toUpperCase();

  const [colorBlob, outlineBlob] = await Promise.all([
    generateIconBlob(192, letter, 'color'),
    generateIconBlob(32, letter, 'outline'),
  ]);

  const zip = buildZip([
    { name: 'manifest.json', data: new TextEncoder().encode(manifestJson) },
    { name: 'color.png', data: new Uint8Array(await colorBlob.arrayBuffer()) },
    { name: 'outline.png', data: new Uint8Array(await outlineBlob.arrayBuffer()) },
  ]);

  const url = URL.createObjectURL(zip);
  const a = document.createElement('a');
  a.href = url;
  const safeName =
    (agentName || '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') || 'novu-agent';
  a.download = `${safeName}-teams-app.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
