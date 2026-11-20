import type { Grid, PageWindow, PosterLayout } from "../../../shared/document";

export interface PageRenderOptions {
  dpi: number;
  /** 彩色字符画（沿用网格内每个字符的颜色） */
  color: boolean;
  /** 单色打印：统一墨色，不改变任何字符位置 */
  mono: boolean;
  background: string;
  /** 白底省墨模式 */
  whiteBg: boolean;
  /** 绘制裁切标记与页序标签（打印元素） */
  marks: boolean;
  /** 高亮重叠带与拼贴指示（仅预览辅助） */
  guides: boolean;
  /** guides 是否会被打印（导出时强制 false） */
  guidesForPrint: boolean;
}

const MONO_INK = "#111111";
const MARK_INK = "#6f7680";
const GUIDE_INK = "rgba(120, 200, 255, 0.55)";
const OVERLAP_FILL = "rgba(110, 190, 255, 0.10)";

export function renderPage(
  canvas: HTMLCanvasElement,
  grid: Grid,
  layout: PosterLayout,
  page: PageWindow,
  opts: PageRenderOptions,
): void {
  const pxPerMm = opts.dpi / 25.4;
  const W = Math.round(layout.paperWidthMm * pxPerMm);
  const H = Math.round(layout.paperHeightMm * pxPerMm);
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;
  const marginPx = ((layout.paperWidthMm - layout.printableWidthMm) / 2) * pxPerMm;

  // 背景
  g.fillStyle = opts.whiteBg ? "#ffffff" : opts.background;
  g.fillRect(0, 0, W, H);

  const cellW = layout.cellWidthMm * pxPerMm;
  const lineH = layout.lineHeightMm * pxPerMm;
  const fontPx = layout.fontPt * (opts.dpi / 72);
  // 单色打印或白底省墨时统一深色墨；深色背景的彩色模式使用各字符原色，其余用浅色墨。
  // 墨色选择不进入分页计算，因此任何模式下字符占位与分页边界完全一致。
  const flatInk = opts.mono || opts.whiteBg;
  const ink = flatInk ? MONO_INK : "#e9eceb";

  // 重叠带高亮（预览辅助，不进入打印文件）
  if (opts.guides && !opts.guidesForPrint) {
    g.fillStyle = OVERLAP_FILL;
    if (page.overlapLeft > 0)
      g.fillRect(marginPx, marginPx, page.overlapLeft * cellW, page.rows * lineH);
    if (page.overlapRight > 0)
      g.fillRect(
        marginPx + (page.cols - page.overlapRight) * cellW,
        marginPx,
        page.overlapRight * cellW,
        page.rows * lineH,
      );
    if (page.overlapTop > 0)
      g.fillRect(marginPx, marginPx, page.cols * cellW, page.overlapTop * lineH);
    if (page.overlapBottom > 0)
      g.fillRect(
        marginPx,
        marginPx + (page.rows - page.overlapBottom) * lineH,
        page.cols * cellW,
        page.overlapBottom * lineH,
      );
  }

  // 字符：位置由 layout 的字符格宽/行高决定，与分页计算共用同一套 pitch，任何字符都完整落在页内
  g.font = `${fontPx}px "Courier New", "Noto Sans Mono", monospace`;
  g.textBaseline = "middle";
  g.textAlign = "center";
  const centerOffset = cellW / 2;
  for (let ly = 0; ly < page.rows; ly++) {
    const gy = page.y0 + ly;
    for (let lx = 0; lx < page.cols; lx++) {
      const gx = page.x0 + lx;
      const cell = grid.cells[gy * grid.columns + gx]!;
      if (cell.glyph === " ") continue;
      g.fillStyle = opts.color && !flatInk ? cell.color : ink;
      g.fillText(
        cell.glyph,
        marginPx + lx * cellW + centerOffset,
        marginPx + ly * lineH + lineH / 2,
      );
    }
  }

  if (opts.marks) {
    drawMarks(g, layout, page, pxPerMm, marginPx, opts.whiteBg);
  }
  if (opts.guides && !opts.guidesForPrint) {
    drawGuides(g, layout, page, pxPerMm, marginPx);
  }
}

function drawMarks(
  g: CanvasRenderingContext2D,
  layout: PosterLayout,
  page: PageWindow,
  pxPerMm: number,
  marginPx: number,
  onWhite: boolean,
) {
  const tick = 4 * pxPerMm;
  const gap = 1.5 * pxPerMm;
  // 边距过小时缩短刻度，绝不让标记伸入字符区域
  const tickLen = Math.max(0, Math.min(tick, marginPx - gap));
  g.strokeStyle = onWhite ? "#333333" : MARK_INK;
  g.fillStyle = g.strokeStyle;
  g.lineWidth = Math.max(1, 0.25 * pxPerMm);
  g.beginPath();
  const v = (mm: number | null, y1: number, y2: number) => {
    if (mm === null || tickLen === 0) return;
    const px = mm * pxPerMm;
    g.moveTo(px, y1);
    g.lineTo(px, y2);
  };
  const hline = (mm: number | null, x1: number, x2: number) => {
    if (mm === null || tickLen === 0) return;
    const py = mm * pxPerMm;
    g.moveTo(x1, py);
    g.lineTo(x2, py);
  };
  // 内边缘裁切线（落在边距内，不触碰内容）
  v(page.cutLeftMm, marginPx - gap - tickLen, marginPx - gap);
  v(page.cutLeftMm, layout.paperHeightMm * pxPerMm - marginPx + gap, layout.paperHeightMm * pxPerMm - marginPx + gap + tickLen);
  v(page.cutRightMm, marginPx - gap - tickLen, marginPx - gap);
  v(page.cutRightMm, layout.paperHeightMm * pxPerMm - marginPx + gap, layout.paperHeightMm * pxPerMm - marginPx + gap + tickLen);
  hline(page.cutTopMm, marginPx - gap - tickLen, marginPx - gap);
  hline(page.cutTopMm, layout.paperWidthMm * pxPerMm - marginPx + gap, layout.paperWidthMm * pxPerMm - marginPx + gap + tickLen);
  hline(page.cutBottomMm, marginPx - gap - tickLen, marginPx - gap);
  hline(page.cutBottomMm, layout.paperWidthMm * pxPerMm - marginPx + gap, layout.paperWidthMm * pxPerMm - marginPx + gap + tickLen);
  g.stroke();

  // 边距不足以容纳文字/箭头时跳过页序标签，避免与字符重叠
  if (marginPx < 4 * pxPerMm) return;

  // 页序 / 拼贴坐标标签
  const label = `第 ${page.pageNo} / ${layout.pageCount} 页 · 拼贴 ${page.tileCol + 1}-${page.tileRow + 1}`;
  g.font = `${Math.max(8, 2.6 * pxPerMm)}px "DM Mono", monospace`;
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillText(label, marginPx, layout.paperHeightMm * pxPerMm - marginPx / 2 - 0.5 * pxPerMm);

  // 拼接方向小箭头：提示该页与邻页的关系
  const cx = layout.paperWidthMm * pxPerMm - marginPx;
  const cy = layout.paperHeightMm * pxPerMm - marginPx;
  const ar = 2.2 * pxPerMm;
  g.strokeStyle = onWhite ? "#777777" : "rgba(160,166,172,0.85)";
  g.beginPath();
  const arrow = (fromX: number, fromY: number, dx: number, dy: number) => {
    g.moveTo(fromX, fromY);
    g.lineTo(fromX + dx * ar, fromY + dy * ar);
    g.moveTo(fromX + dx * ar, fromY + dy * ar);
    g.lineTo(fromX + dx * ar - dy * ar * 0.45, fromY + dy * ar - dx * ar * 0.45);
    g.moveTo(fromX + dx * ar, fromY + dy * ar);
    g.lineTo(fromX + dx * ar + dy * ar * 0.45, fromY + dy * ar + dx * ar * 0.45);
  };
  if (page.cutRightMm !== null) arrow(cx - 2 * ar, cy, 1, 0);
  if (page.cutLeftMm !== null) arrow(marginPx + 2 * ar, cy, -1, 0);
  if (page.cutBottomMm !== null) arrow(cx, cy - 2 * ar, 0, 1);
  if (page.cutTopMm !== null) arrow(cx, marginPx + 2 * ar, 0, -1);
  g.stroke();
}

function drawGuides(
  g: CanvasRenderingContext2D,
  layout: PosterLayout,
  page: PageWindow,
  pxPerMm: number,
  marginPx: number,
) {
  const cellW = layout.cellWidthMm * pxPerMm;
  const lineH = layout.lineHeightMm * pxPerMm;
  g.strokeStyle = GUIDE_INK;
  g.setLineDash([4 * pxPerMm, 3 * pxPerMm]);
  g.lineWidth = Math.max(1, 0.2 * pxPerMm);
  g.beginPath();
  const vline = (xPx: number) => {
    g.moveTo(xPx, marginPx);
    g.lineTo(xPx, marginPx + page.rows * lineH);
  };
  const hline = (yPx: number) => {
    g.moveTo(marginPx, yPx);
    g.lineTo(marginPx + page.cols * cellW, yPx);
  };
  if (page.cutLeftMm !== null) vline(page.cutLeftMm * pxPerMm);
  if (page.cutRightMm !== null) vline(page.cutRightMm * pxPerMm);
  if (page.cutTopMm !== null) hline(page.cutTopMm * pxPerMm);
  if (page.cutBottomMm !== null) hline(page.cutBottomMm * pxPerMm);
  g.stroke();
  g.setLineDash([]);
}
