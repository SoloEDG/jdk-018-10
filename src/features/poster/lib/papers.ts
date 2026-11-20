import type { PaperId, PosterSettings } from "../../../shared/document";

/** ISO 与常见北美纸张规格（毫米，纵向尺寸） */
export const PAPERS: { id: PaperId; name: string; widthMm: number; heightMm: number }[] = [
  { id: "A4", name: "A4 · 210 × 297 mm", widthMm: 210, heightMm: 297 },
  { id: "A3", name: "A3 · 297 × 420 mm", widthMm: 297, heightMm: 420 },
  { id: "LETTER", name: "Letter · 216 × 279 mm", widthMm: 215.9, heightMm: 279.4 },
  { id: "LEGAL", name: "Legal · 216 × 356 mm", widthMm: 215.9, heightMm: 355.6 },
  { id: "TABLOID", name: "Tabloid · 279 × 432 mm", widthMm: 279.4, heightMm: 431.8 },
  { id: "CUSTOM", name: "自定义尺寸", widthMm: 0, heightMm: 0 },
];

export const MIN_PAPER_MM = 60;
export const MAX_PAPER_MM = 2000;
export const PT_PER_MM = 72 / 25.4;
export const MM_PER_PT = 25.4 / 72;
/** 等宽字体的字符前进宽度（em 比例），计算与渲染共用同一常量 */
export const CELL_EM = 0.62;
/** 行高（字号倍数），计算与渲染共用同一常量 */
export const LINE_EM = 1.25;
export const MIN_FONT_PT = 4;
export const MAX_FONT_PT = 48;

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** 返回纸张短边/长边按方向排列后的实际宽高（毫米） */
export function paperSizeMm(s: PosterSettings): { widthMm: number; heightMm: number } {
  let w: number;
  let h: number;
  if (s.paperId === "CUSTOM") {
    w = clamp(s.customWidthMm, MIN_PAPER_MM, MAX_PAPER_MM);
    h = clamp(s.customHeightMm, MIN_PAPER_MM, MAX_PAPER_MM);
  } else {
    const p = PAPERS.find((p) => p.id === s.paperId) ?? PAPERS[0]!;
    w = p.widthMm;
    h = p.heightMm;
  }
  return s.landscape ? { widthMm: Math.max(w, h), heightMm: Math.min(w, h) } : { widthMm: Math.min(w, h), heightMm: Math.max(w, h) };
}

/** 字号（pt）换算出的字符格宽与行高（毫米） */
export function pitchForFont(fontPt: number): { cellWidthMm: number; lineHeightMm: number } {
  return {
    cellWidthMm: fontPt * CELL_EM * MM_PER_PT,
    lineHeightMm: fontPt * LINE_EM * MM_PER_PT,
  };
}
