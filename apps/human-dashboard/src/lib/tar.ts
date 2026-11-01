/**
 * The two parts of the tar format the skills index needs (`src/lib/agent-skills.ts`): reading the archive GitHub
 * makes of a repository, and writing a skill's folder as one. Regular files only: no folders, links or modes.
 */

const BLOCK = 512;

export interface TarFile {
  path: string;
  content: Buffer;
}

/**
 * The regular files in a tar archive, and its pax `comment`, where `git archive` (and so GitHub) writes the
 * commit the archive was made from.
 */
export function readTar(tar: Buffer): { files: TarFile[]; comment: string | null } {
  const files: TarFile[] = [];
  let comment: string | null = null;
  // A pax header (`x`) gives the next entry's path when it doesn't fit in the entry's own header.
  let nextPath: string | null = null;

  for (let offset = 0; offset + BLOCK <= tar.length; ) {
    const header = tar.subarray(offset, offset + BLOCK);
    if (header.every((byte) => byte === 0)) break;

    const size = Number.parseInt(field(header, 124, 12).trim() || '0', 8);
    const type = String.fromCharCode(header[156]);
    const body = tar.subarray(offset + BLOCK, offset + BLOCK + size);
    offset += BLOCK + Math.ceil(size / BLOCK) * BLOCK;

    if (type === 'g' || type === 'x') {
      const records = paxRecords(body);
      if (type === 'g') comment = records.get('comment') ?? comment;
      else nextPath = records.get('path') ?? null;
      continue;
    }

    const name = field(header, 0, 100);
    const prefix = field(header, 345, 155);
    const path = nextPath ?? (prefix ? `${prefix}/${name}` : name);
    nextPath = null;
    // `0`, or NUL in old archives, is a regular file.
    if (type === '0' || type === '\0') files.push({ path, content: Buffer.from(body) });
  }

  return { files, comment };
}

/**
 * A tar archive of `files` that comes out as the same bytes every time for the same files: in path order, with
 * no dates or owners, and every file `0644`.
 */
export function writeTar(files: TarFile[]): Buffer {
  const sorted = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const blocks = sorted.flatMap(({ path, content }) => [
    fileHeader(path, content.length),
    content,
    Buffer.alloc((BLOCK - (content.length % BLOCK)) % BLOCK),
  ]);

  // Two empty blocks end an archive.
  return Buffer.concat([...blocks, Buffer.alloc(BLOCK * 2)]);
}

function fileHeader(path: string, size: number): Buffer {
  const { prefix, name } = splitPath(path);
  const header = Buffer.alloc(BLOCK);
  header.write(name, 0, 100);
  header.write('0000644\0', 100); // mode
  header.write('0000000\0', 108); // owner
  header.write('0000000\0', 116); // group
  header.write(`${size.toString(8).padStart(11, '0')}\0`, 124);
  header.write('00000000000\0', 136); // modified
  header.write(' '.repeat(8), 148); // the checksum counts its own field as spaces
  header.write('0', 156); // a regular file
  header.write('ustar\u000000', 257); // format and version
  header.write(prefix, 345, 155);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148);

  return header;
}

/** A path as the header's `prefix` and `name` fields: `name` holds 100 bytes, so a longer path is cut at a slash. */
function splitPath(path: string): { prefix: string; name: string } {
  if (Buffer.byteLength(path) <= 100) return { prefix: '', name: path };

  for (let slash = path.indexOf('/'); slash !== -1; slash = path.indexOf('/', slash + 1)) {
    const prefix = path.slice(0, slash);
    const name = path.slice(slash + 1);
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(name) <= 100) return { prefix, name };
  }

  throw new Error(`${path} is too long for a tar header`);
}

/** A text field of a header, which ends at its first NUL. */
function field(header: Buffer, start: number, length: number): string {
  const end = header.subarray(start, start + length).indexOf(0);

  return header.toString('utf8', start, end === -1 ? start + length : start + end);
}

/** The `key=value` records of a pax header, each written as `<length> <key>=<value>\n`. */
function paxRecords(body: Buffer): Map<string, string> {
  const records = new Map<string, string>();
  for (let offset = 0; offset < body.length; ) {
    const space = body.indexOf(0x20, offset);
    const length = Number.parseInt(body.toString('utf8', offset, space), 10);
    if (space === -1 || !(length > 0)) break;

    // The length counts every byte of the record, up to and including its newline.
    const record = body.toString('utf8', space + 1, offset + length - 1);
    const equals = record.indexOf('=');
    if (equals > 0) records.set(record.slice(0, equals), record.slice(equals + 1));
    offset += length;
  }

  return records;
}
