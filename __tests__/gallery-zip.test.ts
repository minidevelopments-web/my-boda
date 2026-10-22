/**
 * @jest-environment node
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { zipPhotoChunks, photoEntryName, type ZipPhoto } from "@/lib/gallery/zip";

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gallery-zip-"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

async function collect(generator: AsyncGenerator<Buffer>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of generator) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function parseEntries(buf: Buffer) {
  const eocd = buf.length - 22;
  expect(buf.readUInt32LE(eocd)).toBe(0x06054b50);
  const count = buf.readUInt16LE(eocd + 10);
  const cdSize = buf.readUInt32LE(eocd + 12);
  const cdOffset = buf.readUInt32LE(eocd + 16);

  const entries: Array<{ name: string; data: Buffer; crc: number }> = [];
  let cursor = cdOffset;
  for (let i = 0; i < count; i++) {
    expect(buf.readUInt32LE(cursor)).toBe(0x02014b50);
    const crc = buf.readUInt32LE(cursor + 16);
    const size = buf.readUInt32LE(cursor + 24);
    const nameLength = buf.readUInt16LE(cursor + 28);
    const extraLength = buf.readUInt16LE(cursor + 30);
    const commentLength = buf.readUInt16LE(cursor + 32);
    const localOffset = buf.readUInt32LE(cursor + 42);
    const name = buf.toString("utf8", cursor + 46, cursor + 46 + nameLength);

    expect(buf.readUInt32LE(localOffset)).toBe(0x04034b50);
    const localNameLength = buf.readUInt16LE(localOffset + 26);
    const localExtraLength = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    entries.push({ name, crc, data: buf.subarray(dataStart, dataStart + size) });

    cursor += 46 + nameLength + extraLength + commentLength;
  }
  expect(cursor).toBe(cdOffset + cdSize);
  return entries;
}

const photo = (id: string, uploaderName: string): ZipPhoto => ({
  id,
  fileName: `${id}.jpg`,
  uploaderName,
  createdAt: new Date("2027-06-12T18:30:00Z"),
});

it("streams a valid ZIP with full-size files and readable names", async () => {
  await fs.writeFile(path.join(dir, "aaaaaaaa1.jpg"), Buffer.from("first-photo"));
  await fs.writeFile(path.join(dir, "bbbbbbbb2.jpg"), Buffer.from("second-photo"));

  const read = (name: string) => fs.readFile(path.join(dir, name)).catch(() => null);
  const zip = await collect(zipPhotoChunks([photo("aaaaaaaa1", "Ana Pérez"), photo("bbbbbbbb2", "Sam")], read));
  const entries = parseEntries(zip);

  expect(entries).toHaveLength(2);
  expect(entries[0].name).toBe(photoEntryName(photo("aaaaaaaa1", "Ana Pérez")));
  expect(entries[0].name).toMatch(/^2027-06-12-ana-perez-aaaaaaaa\.jpg$/);
  expect(entries[0].data.toString()).toBe("first-photo");
  expect(entries[1].data.toString()).toBe("second-photo");
});

it("skips a missing file and still produces a valid archive", async () => {
  await fs.writeFile(path.join(dir, "aaaaaaaa1.jpg"), Buffer.from("first-photo"));
  const read = (name: string) => fs.readFile(path.join(dir, name)).catch(() => null);

  const entries = parseEntries(await collect(zipPhotoChunks([photo("aaaaaaaa1", "Ana"), photo("missing1", "Sam")], read)));
  expect(entries).toHaveLength(1);
});

it("produces a valid empty ZIP", async () => {
  const zip = await collect(zipPhotoChunks([], async () => null));
  expect(zip.length).toBe(22);
  expect(parseEntries(zip)).toHaveLength(0);
});
