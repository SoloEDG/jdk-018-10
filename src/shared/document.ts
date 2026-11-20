export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Asset {
  name: string;
  url: string;
  width: number;
  height: number;
  image: HTMLImageElement;
}
export interface Settings {
  columns: number;
  charset: string;
  custom: string;
  contrast: number;
  gamma: number;
  invert: boolean;
  color: boolean;
  background: string;
}
export interface Cell {
  glyph: string;
  color: string;
}
export interface Grid {
  columns: number;
  rows: number;
  cells: Cell[];
  revision: number;
}

export type PosterFit = "font" | "poster";
export type PaperId =
  | "A4"
  | "A3"
  | "LETTER"
  | "LEGAL"
  | "TABLOID"
  | "CUSTOM";

export interface PosterSettings {
  paperId: PaperId;
  customWidthMm: number;
  customHeightMm: number;
  landscape: boolean;
  /** 页边距（毫米），纸张四边留白 */
  marginMm: number;
  /** 拼接重叠带宽度（毫米），分页时换算为整字符列/行 */
  overlapMm: number;
  /** 是否绘制裁切标记与拼贴指示 */
  marks: boolean;
  /** font = 固定字号（页数随内容增长）；poster = 固定海报尺寸（反推字号） */
  fit: PosterFit;
  /** 固定字号模式下使用的字号（pt） */
  fontPt: number;
  /** 固定海报尺寸模式下的目标成品尺寸（毫米） */
  targetWidthMm: number;
  targetHeightMm: number;
  /** 可接受的最大纸张数 */
  maxSheets: number;
  /** 单色打印：仅改变墨色，不参与任何分页计算 */
  mono: boolean;
  /** 打印时使用白底，节省墨水（不影响字符占位） */
  whiteBg: boolean;
  /** 预览中高亮重叠带（不会打印出来） */
  guides: boolean;
}

/** 单张纸在完整字符网格上截取的窗口 */
export interface PageWindow {
  /** 全局页序（0 基） */
  index: number;
  /** 人类可读页号（1 基） */
  pageNo: number;
  /** 拼贴行列位置（0 基） */
  tileCol: number;
  tileRow: number;
  /** 在主字符网格中的起始列/行 */
  x0: number;
  y0: number;
  /** 本页实际包含的字符列数/行数（末页可能不满） */
  cols: number;
  rows: number;
  /** 各边缘重复自相邻页的字符数（0 表示该边是海报外缘） */
  overlapLeft: number;
  overlapRight: number;
  overlapTop: number;
  overlapBottom: number;
  /** 裁切线在纸张上的坐标（毫米，相对纸张左上角）；外缘为 null */
  cutLeftMm: number | null;
  cutRightMm: number | null;
  cutTopMm: number | null;
  cutBottomMm: number | null;
}

export interface PosterLayout {
  gridRevision: number;
  paperWidthMm: number;
  paperHeightMm: number;
  printableWidthMm: number;
  printableHeightMm: number;
  fontPt: number;
  cellWidthMm: number;
  lineHeightMm: number;
  colsPerPage: number;
  rowsPerPage: number;
  overlapCols: number;
  overlapRows: number;
  stepCols: number;
  stepRows: number;
  tileCols: number;
  tileRows: number;
  pageCount: number;
  pages: PageWindow[];
  /** 拼回后的唯一内容成品尺寸（不含重复重叠带） */
  posterWidthMm: number;
  posterHeightMm: number;
  targetWidthMm: number | null;
  targetHeightMm: number | null;
  deviationWidthMm: number | null;
  deviationHeightMm: number | null;
  overSheetCap: boolean;
  warnings: string[];
  error: string | null;
}

export interface StudioDocument {
  asset: Asset | null;
  crop: Crop;
  settings: Settings;
  poster: PosterSettings;
  grid: Grid | null;
  revision: number;
}
