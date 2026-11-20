import type {
  Grid,
  PageWindow,
  PosterLayout,
  PosterSettings,
} from "../../../shared/document";
import {
  MAX_FONT_PT,
  MIN_FONT_PT,
  clamp,
  paperSizeMm,
  pitchForFont,
} from "./papers";

const MM_EPS = 1e-6;

function baseLayout(
  grid: Grid,
  s: PosterSettings,
  fontPt: number,
): PosterLayout {
  const { widthMm: paperWidthMm, heightMm: paperHeightMm } = paperSizeMm(s);
  const marginMm = clamp(s.marginMm, 0, Math.min(paperWidthMm, paperHeightMm) / 3);
  const printableWidthMm = Math.max(1, paperWidthMm - marginMm * 2);
  const printableHeightMm = Math.max(1, paperHeightMm - marginMm * 2);

  const { cellWidthMm, lineHeightMm } = pitchForFont(fontPt);
  const colsPerPage = Math.max(1, Math.floor(printableWidthMm / cellWidthMm));
  const rowsPerPage = Math.max(1, Math.floor(printableHeightMm / lineHeightMm));

  const overlapCols = clamp(
    Math.floor(s.overlapMm / cellWidthMm),
    0,
    colsPerPage - 1,
  );
  const overlapRows = clamp(
    Math.floor(s.overlapMm / lineHeightMm),
    0,
    rowsPerPage - 1,
  );
  const stepCols = colsPerPage - overlapCols;
  const stepRows = rowsPerPage - overlapRows;

  const tileCols = Math.max(1, Math.ceil((grid.columns - overlapCols) / stepCols));
  const tileRows = Math.max(1, Math.ceil((grid.rows - overlapRows) / stepRows));

  // 先计算所有原始窗口；末列/末行回贴到网格边缘，保证最后一个字符完整落页
  const win: { x0: number; y0: number; x1: number; y1: number }[][] = [];
  for (let ty = 0; ty < tileRows; ty++) {
    const y0 = Math.min(ty * stepRows, Math.max(0, grid.rows - rowsPerPage));
    const row: typeof win[number] = [];
    for (let tx = 0; tx < tileCols; tx++) {
      const x0 = Math.min(tx * stepCols, Math.max(0, grid.columns - colsPerPage));
      row.push({
        x0,
        y0,
        x1: Math.min(grid.columns, x0 + colsPerPage),
        y1: Math.min(grid.rows, y0 + rowsPerPage),
      });
    }
    win.push(row);
  }

  const pages: PageWindow[] = [];
  for (let ty = 0; ty < tileRows; ty++) {
    for (let tx = 0; tx < tileCols; tx++) {
      const w = win[ty]![tx]!;
      // 重叠量直接取相邻窗口的真实交集（含末页回贴情形），外缘为 0
      const leftWin = tx === 0 ? null : win[ty]![tx - 1]!;
      const rightWin = tx === tileCols - 1 ? null : win[ty]![tx + 1]!;
      const topWin = ty === 0 ? null : win[ty - 1]![tx]!;
      const bottomWin = ty === tileRows - 1 ? null : win[ty + 1]![tx]!;
      const overlapLeft = leftWin ? Math.max(0, leftWin.x1 - w.x0) : 0;
      const overlapRight = rightWin ? Math.max(0, w.x1 - rightWin.x0) : 0;
      const overlapTop = topWin ? Math.max(0, topWin.y1 - w.y0) : 0;
      const overlapBottom = bottomWin ? Math.max(0, w.y1 - bottomWin.y0) : 0;
      pages.push({
        index: pages.length,
        pageNo: pages.length + 1,
        tileCol: tx,
        tileRow: ty,
        x0: w.x0,
        y0: w.y0,
        cols: w.x1 - w.x0,
        rows: w.y1 - w.y0,
        overlapLeft,
        overlapRight,
        overlapTop,
        overlapBottom,
        // 裁切线 = 页内重叠带之外的唯一内容边界，落在边距区内不触碰字符
        cutLeftMm: tx === 0 ? null : marginMm + overlapLeft * cellWidthMm,
        cutRightMm:
          tx === tileCols - 1 ? null : marginMm + (w.x1 - w.x0 - overlapRight) * cellWidthMm,
        cutTopMm: ty === 0 ? null : marginMm + overlapTop * lineHeightMm,
        cutBottomMm:
          ty === tileRows - 1 ? null : marginMm + (w.y1 - w.y0 - overlapBottom) * lineHeightMm,
      });
    }
  }

  // 拼回后的唯一成品尺寸就是完整网格的物理尺寸；重叠带只算一次，末页留空不拉伸
  const posterWidthMm = grid.columns * cellWidthMm;
  const posterHeightMm = grid.rows * lineHeightMm;

  return {
    gridRevision: grid.revision,
    paperWidthMm,
    paperHeightMm,
    printableWidthMm,
    printableHeightMm,
    fontPt,
    cellWidthMm,
    lineHeightMm,
    colsPerPage,
    rowsPerPage,
    overlapCols,
    overlapRows,
    stepCols,
    stepRows,
    tileCols,
    tileRows,
    pageCount: pages.length,
    pages,
    posterWidthMm,
    posterHeightMm,
    targetWidthMm: null,
    targetHeightMm: null,
    deviationWidthMm: null,
    deviationHeightMm: null,
    overSheetCap: false,
    warnings: [],
    error: null,
  };
}

function withWarnings(
  layout: PosterLayout,
  s: PosterSettings,
): PosterLayout {
  const warnings: string[] = [];
  // 实际重叠按整字符取整后可能小于设定值，明确告知实际毫米数
  const realOverlapMm = Math.min(
    layout.overlapCols * layout.cellWidthMm,
    layout.overlapRows * layout.lineHeightMm,
  );
  if (s.overlapMm > 0 && realOverlapMm + 1e-6 < s.overlapMm) {
    warnings.push(
      `重叠带按整字符取整：设定 ${s.overlapMm} mm，实际约 ${realOverlapMm.toFixed(1)} mm（${layout.overlapCols} 列 / ${layout.overlapRows} 行）`,
    );
  }
  if (layout.pageCount > s.maxSheets) {
    layout.overSheetCap = true;
    warnings.push(
      `需要 ${layout.pageCount} 张纸，超出设定上限 ${s.maxSheets} 张；请缩小字号或调整纸张/边距`,
    );
  }
  layout.warnings = warnings;
  return layout;
}

/** 固定字号：页数与成品尺寸完全由字号、纸张可印范围和完整网格决定 */
function fitByFont(grid: Grid, s: PosterSettings): PosterLayout {
  const fontPt = clamp(s.fontPt, MIN_FONT_PT, MAX_FONT_PT);
  const layout = baseLayout(grid, s, fontPt) as PosterLayout;
  return withWarnings(layout, s);
}

/**
 * 固定海报尺寸：在允许的字号区间内反推最大字号，使成品不超过目标尺寸。
 * 页数随字号单调变化，因此用二分查找；最终报告实际成品与目标的偏差。
 */
function fitByPoster(grid: Grid, s: PosterSettings): PosterLayout {
  const targetW = clamp(s.targetWidthMm, 50, 20000);
  const targetH = clamp(s.targetHeightMm, 50, 20000);

  const fits = (fontPt: number) => {
    const l = baseLayout(grid, s, fontPt);
    return l.posterWidthMm <= targetW + MM_EPS && l.posterHeightMm <= targetH + MM_EPS;
  };

  let lo = MIN_FONT_PT;
  let hi = MAX_FONT_PT;
  if (!fits(lo)) {
    // 最小字号仍超出目标：保留最小字号结果并明确报告偏差
    const layout = baseLayout(grid, s, lo) as PosterLayout;
    layout.targetWidthMm = targetW;
    layout.targetHeightMm = targetH;
    layout.deviationWidthMm = layout.posterWidthMm - targetW;
    layout.deviationHeightMm = layout.posterHeightMm - targetH;
    layout.warnings = [
      `即使采用最小字号 ${lo} pt，成品仍超出目标：宽 +${layout.deviationWidthMm.toFixed(1)} mm、高 +${layout.deviationHeightMm.toFixed(1)} mm`,
    ];
    layout.overSheetCap = layout.pageCount > s.maxSheets;
    if (layout.overSheetCap)
      layout.warnings.push(
        `需要 ${layout.pageCount} 张纸，超出设定上限 ${s.maxSheets} 张`,
      );
    return layout;
  }

  let best = lo;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  best = Math.floor(best * 10) / 10;
  if (!fits(best)) best = Math.floor(best * 10) / 10 - 0.1;
  best = clamp(best, MIN_FONT_PT, MAX_FONT_PT);

  const layout = baseLayout(grid, s, best) as PosterLayout;
  layout.targetWidthMm = targetW;
  layout.targetHeightMm = targetH;
  layout.deviationWidthMm = layout.posterWidthMm - targetW;
  layout.deviationHeightMm = layout.posterHeightMm - targetH;
  const dw = Math.abs(layout.deviationWidthMm);
  const dh = Math.abs(layout.deviationHeightMm);
  if (dw > 0.5 || dh > 0.5) {
    layout.warnings = [
      `受整字符与整页边界约束，实际成品 ${layout.posterWidthMm.toFixed(1)} × ${layout.posterHeightMm.toFixed(1)} mm，比目标小 ${dw.toFixed(1)} × ${dh.toFixed(1)} mm（等比缩小，不裁切任何内容）`,
    ];
  }
  return withWarnings(layout, s);
}

/**
 * 基于同一份完整字符网格计算分页。
 * 分页只依赖字符行列数、纸张、边距、重叠和字号——颜色与单色设置不参与，
 * 因此彩色/单色切换永远不会改变字符占位与分页边界。
 */
export function buildPosterLayout(
  grid: Grid,
  s: PosterSettings,
): PosterLayout {
  try {
    return s.fit === "poster" ? fitByPoster(grid, s) : fitByFont(grid, s);
  } catch (e) {
    return emptyLayout(grid, s, e instanceof Error ? e.message : "分页计算失败");
  }
}

export function emptyLayout(
  grid: Grid | null,
  s: PosterSettings,
  error: string,
): PosterLayout {
  const { widthMm, heightMm } = paperSizeMm(s);
  const marginMm = clamp(s.marginMm, 0, Math.min(widthMm, heightMm) / 3);
  return {
    gridRevision: grid?.revision ?? -1,
    paperWidthMm: widthMm,
    paperHeightMm: heightMm,
    printableWidthMm: Math.max(1, widthMm - marginMm * 2),
    printableHeightMm: Math.max(1, heightMm - marginMm * 2),
    fontPt: s.fit === "font" ? clamp(s.fontPt, MIN_FONT_PT, MAX_FONT_PT) : MIN_FONT_PT,
    cellWidthMm: 0,
    lineHeightMm: 0,
    colsPerPage: 0,
    rowsPerPage: 0,
    overlapCols: 0,
    overlapRows: 0,
    stepCols: 0,
    stepRows: 0,
    tileCols: 0,
    tileRows: 0,
    pageCount: 0,
    pages: [],
    posterWidthMm: 0,
    posterHeightMm: 0,
    targetWidthMm: s.fit === "poster" ? s.targetWidthMm : null,
    targetHeightMm: s.fit === "poster" ? s.targetHeightMm : null,
    deviationWidthMm: null,
    deviationHeightMm: null,
    overSheetCap: false,
    warnings: [],
    error,
  };
}
