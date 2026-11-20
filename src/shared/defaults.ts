import type { StudioDocument } from "./document";
export function createDocument(): StudioDocument {
  return {
    asset: null,
    crop: { x: 0, y: 0, width: 1, height: 1 },
    settings: {
      columns: 100,
      charset: "standard",
      custom: " .:-=+*#%@",
      contrast: 1,
      gamma: 1,
      invert: false,
      color: true,
      background: "#101216",
    },
    poster: {
      paperId: "A4",
      customWidthMm: 210,
      customHeightMm: 297,
      landscape: false,
      marginMm: 12,
      overlapMm: 12,
      marks: true,
      fit: "font",
      fontPt: 10,
      targetWidthMm: 800,
      targetHeightMm: 600,
      maxSheets: 36,
      mono: false,
      whiteBg: false,
      guides: true,
    },
    grid: null,
    revision: 0,
  };
}
