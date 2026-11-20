/**
 * 零依赖 ZIP（仅 store，不压缩）生成器。
 * 用于逐页 PNG 打包；逐文件写入、可随时取消，取消时不会产出任何文件。
 */
import { CancelledError, type CancelCheck } from "./pdf";

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++)
    c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const enc = new TextEncoder();

function u16(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
}
function u32(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
}
function dosTime(date: Date): { time: number; date: number } {
  return {
    time:
      (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() / 2),
    date:
      ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

export async function buildZip(
  entries: ZipEntry[],
  cancel: CancelCheck,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  if (entries.length === 0) throw new Error("没有可打包的页面");
  const localChunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const now = dosTime(new Date());

  for (let i = 0; i < entries.length; i++) {
    if (cancel()) throw new CancelledError();
    const { name, data } = entries[i]!;
    const nameBytes = enc.encode(name);
    const crc = crc32(data);

    const localHeader = [
      u32(0x04034b50),
      u16(20), // version needed
      u16(0x0800), // UTF-8 文件名标志
      u16(0), // store
      u16(now.time),
      u16(now.date),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
    ];
    for (const c of localHeader) localChunks.push(c);
    localChunks.push(nameBytes, data);

    const centralHeader = [
      u32(0x02014b50),
      u16(20), // version made by
      u16(20),
      u16(0x0800),
      u16(0),
      u16(now.time),
      u16(now.date),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
    ];
    for (const c of centralHeader) central.push(c);
    central.push(nameBytes);

    offset += localHeader.reduce((s, b) => s + b.length, 0) + nameBytes.length + data.length;
    onProgress?.(i + 1, entries.length);
    await new Promise((r) => setTimeout(r, 0));
  }

  const centralSize = central.reduce((s, b) => s + b.length, 0);
  const end = [
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralSize),
    u32(offset),
    u16(0),
  ];

  return new Blob([...localChunks, ...central, ...end] as BlobPart[], {
    type: "application/zip",
  });
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("页面编码失败"));
        return;
      }
      blob
        .arrayBuffer()
        .then((buf) => resolve(new Uint8Array(buf)))
        .catch(reject);
    }, "image/png");
  });
}
