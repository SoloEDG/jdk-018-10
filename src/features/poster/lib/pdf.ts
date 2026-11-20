/**
 * 极简多页 PDF 生成器：每页为一张全幅 JPEG（DCTDecode）。
 * 仅使用 ASCII 字符串拼接与长度/偏移统计，零依赖、可取消。
 *
 * 对象编号：
 *   第 i 页（0 基）占用 3i+1..3i+3：页对象 / 内容流 / JPEG 图像
 *   之后依次为 Pages 树根与 Catalog
 */

export interface PdfPageInput {
  jpeg: Uint8Array;
  widthPx: number;
  heightPx: number;
}

export class CancelledError extends Error {
  constructor() {
    super("已取消");
    this.name = "CancelledError";
  }
}

export type CancelCheck = () => boolean;

const enc = new TextEncoder();

function ascii(s: string): Uint8Array {
  return enc.encode(s);
}

const PAGE = 3;
const pageObjId = (i: number) => i * PAGE + 1;

export async function buildPdf(
  pages: PdfPageInput[],
  cancel: CancelCheck,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  if (pages.length === 0) throw new Error("没有可导出的页面");
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (data: Uint8Array | string) => {
    const b = typeof data === "string" ? ascii(data) : data;
    chunks.push(b);
    length += b.length;
  };

  push("%PDF-1.4\n%âãÏÓ\n");
  const total = pages.length;
  const pagesRootId = total * PAGE + 1;
  const catalogId = pagesRootId + 1;

  for (let i = 0; i < total; i++) {
    if (cancel()) throw new CancelledError();
    const p = pages[i]!;
    const id = pageObjId(i);
    const contentId = id + 1;
    const imageId = id + 2;

    offsets[id] = length;
    push(
      `${id} 0 obj\n<< /Type /Page /Parent ${pagesRootId} 0 R ` +
        `/MediaBox [0 0 ${p.widthPx} ${p.heightPx}] ` +
        `/Resources << /XObject << /Im${i} ${imageId} 0 R >> /ProcSet [/PDF /ImageC] >> ` +
        `/Contents ${contentId} 0 R >>\nendobj\n`,
    );

    // 内容流：整页绘制图像
    const stream = `q ${p.widthPx} 0 0 ${p.heightPx} 0 0 cm /Im${i} Do Q`;
    offsets[contentId] = length;
    push(
      `${contentId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    );

    // JPEG 图像对象（DeviceRGB，DCTDecode）
    offsets[imageId] = length;
    push(
      `${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.widthPx} /Height ${p.heightPx} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`,
    );
    push(p.jpeg);
    push("\nendstream\nendobj\n");
    onProgress?.(i + 1, total);
    // 让出事件循环，保证取消与进度刷新
    await new Promise((r) => setTimeout(r, 0));
  }

  // Pages 树根
  const kids = pages.map((_, i) => `${pageObjId(i)} 0 R`).join(" ");
  offsets[pagesRootId] = length;
  push(
    `${pagesRootId} 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`,
  );

  // Catalog
  offsets[catalogId] = length;
  push(`${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesRootId} 0 R >>\nendobj\n`);

  const xrefStart = length;
  push(`xref\n0 ${catalogId + 1}\n`);
  push("0000000000 65535 f \n");
  for (let id = 1; id <= catalogId; id++) {
    const off = offsets[id] ?? 0;
    push(`${String(off).padStart(10, "0")} 00000 n \n`);
  }
  push(
    `trailer\n<< /Size ${catalogId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  );

  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

/** canvas 编码为 JPEG 字节（质量 0.92，适合打印） */
export function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.92): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("页面编码失败"));
          return;
        }
        blob
          .arrayBuffer()
          .then((buf) => resolve(new Uint8Array(buf)))
          .catch(reject);
      },
      "image/jpeg",
      quality,
    );
  });
}
