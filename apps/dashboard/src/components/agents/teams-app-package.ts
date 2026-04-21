/**
 * Generates a Teams app package (.zip) in the browser — no server or dependencies needed.
 *
 * Contains: manifest.json (pre-filled), color.png (192x192), outline.png (32x32).
 * Uses store-only zip (no compression) since PNGs are already compressed and the JSON is tiny.
 */

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
// Minimal ZIP builder (store-only, no compression)
// ---------------------------------------------------------------------------

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(files: { name: string; data: Uint8Array }[]): Blob {
  const parts: Uint8Array[] = [];
  const centralEntries: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);

    const local = new ArrayBuffer(30 + nameBytes.length);
    const lv = new DataView(local);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, file.data.length, true);
    lv.setUint32(22, file.data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    new Uint8Array(local).set(nameBytes, 30);

    parts.push(new Uint8Array(local), file.data);

    const central = new ArrayBuffer(46 + nameBytes.length);
    const cv = new DataView(central);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, file.data.length, true);
    cv.setUint32(24, file.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    new Uint8Array(central).set(nameBytes, 46);

    centralEntries.push(new Uint8Array(central));
    offset += 30 + nameBytes.length + file.data.length;
  }

  const centralSize = centralEntries.reduce((s, e) => s + e.length, 0);
  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  return new Blob([...parts, ...centralEntries, new Uint8Array(eocd)], { type: 'application/zip' });
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
