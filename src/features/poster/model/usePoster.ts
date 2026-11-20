import { computed, ref } from "vue";
import { useStudio } from "../../../shared/useStudio";
import type { PosterLayout } from "../../../shared/document";
import { buildPosterLayout, emptyLayout } from "../lib/pagination";
import { renderPage } from "../lib/render";
import { buildPdf, canvasToJpeg, CancelledError } from "../lib/pdf";
import { buildZip, canvasToPng } from "../lib/zip";
import { download, exportName } from "../../export/lib/download";

export const PREVIEW_DPI = 96;
export const EXPORT_DPI = 200;

export function usePoster() {
  const { doc, busy, notice } = useStudio();
  const activePage = ref(0);
  const exporting = ref(false);
  const exportProgress = ref(0);
  const exportTotal = ref(0);
  let cancelFlag = false;

  /**
   * 分页结果始终派生自当前完整网格；grid.revision 变化（裁剪/密度/字符集等改动）
   * 后旧结果自然失效——stale 为 true 时 UI 与导出一律拒绝使用。
   */
  const layout = computed<PosterLayout>(() => {
    if (!doc.grid) return emptyLayout(null, doc.poster, "请先载入图片并生成字符画");
    return buildPosterLayout(doc.grid, doc.poster);
  });

  const stale = computed(
    () => !doc.grid || layout.value.gridRevision !== doc.revision || busy.value,
  );
  const currentPage = computed(
    () => layout.value.pages[Math.min(activePage.value, Math.max(0, layout.value.pages.length - 1))] ?? null,
  );

  function clampPage() {
    const max = Math.max(0, layout.value.pages.length - 1);
    if (activePage.value > max) activePage.value = max;
  }
  function go(i: number) {
    activePage.value = Math.max(0, Math.min(layout.value.pages.length - 1, i));
  }

  function ensureReady(): boolean {
    if (!doc.grid || layout.value.error || layout.value.pages.length === 0) {
      notice.value = layout.value.error ?? "暂无可导出的分页";
      return false;
    }
    if (stale.value) {
      notice.value = "字符布局已变更，分页已失效，请等待重新生成后再导出";
      return false;
    }
    if (exporting.value) return false;
    return true;
  }

  function renderOptions(guidesForPrint: boolean) {
    return {
      dpi: EXPORT_DPI,
      color: doc.settings.color,
      mono: doc.poster.mono,
      background: doc.settings.background,
      whiteBg: doc.poster.whiteBg,
      // 打印文件始终只输出裁切标记；重叠高亮仅存在于屏幕预览
      marks: doc.poster.marks,
      guides: doc.poster.guides,
      guidesForPrint,
    };
  }

  function pageName(i: number, ext: string) {
    const base = exportName(doc.asset?.name ?? "art", ext).replace(
      /\.[^.]+$/,
      "",
    );
    const p = layout.value.pages[i]!;
    return `${base}-p${String(p.pageNo).padStart(2, "0")}-${p.tileCol + 1}x${p.tileRow + 1}.${ext}`;
  }

  async function exportPdf() {
    if (!ensureReady()) return;
    exporting.value = true;
    cancelFlag = false;
    exportTotal.value = layout.value.pages.length;
    exportProgress.value = 0;
    const canvas = document.createElement("canvas");
    const inputs: { jpeg: Uint8Array; widthPx: number; heightPx: number }[] = [];
    try {
      for (let i = 0; i < layout.value.pages.length; i++) {
        if (cancelFlag) throw new CancelledError();
        renderPage(
          canvas,
          doc.grid!,
          layout.value,
          layout.value.pages[i]!,
          renderOptions(true),
        );
        const jpeg = await canvasToJpeg(canvas);
        inputs.push({ jpeg, widthPx: canvas.width, heightPx: canvas.height });
        exportProgress.value = i + 1;
        if (cancelFlag) throw new CancelledError();
      }
      const pdf = await buildPdf(
        inputs,
        () => cancelFlag,
        (done) => (exportProgress.value = done),
      );
      if (cancelFlag) throw new CancelledError();
      download(pdf, exportName(doc.asset?.name ?? "art", "pdf"));
      notice.value = `海报 PDF 已生成，共 ${layout.value.pages.length} 页`;
    } catch (e) {
      if (e instanceof CancelledError) notice.value = "已取消导出，未生成任何文件";
      else notice.value = e instanceof Error ? e.message : "PDF 生成失败";
    } finally {
      // 无论成功或取消都释放本次管线的全部临时资源，绝不保留缺页文件
      inputs.length = 0;
      canvas.width = 0;
      canvas.height = 0;
      exporting.value = false;
      exportProgress.value = 0;
    }
  }

  async function exportZip() {
    if (!ensureReady()) return;
    exporting.value = true;
    cancelFlag = false;
    exportTotal.value = layout.value.pages.length;
    exportProgress.value = 0;
    const canvas = document.createElement("canvas");
    const entries: { name: string; data: Uint8Array }[] = [];
    try {
      for (let i = 0; i < layout.value.pages.length; i++) {
        if (cancelFlag) throw new CancelledError();
        renderPage(
          canvas,
          doc.grid!,
          layout.value,
          layout.value.pages[i]!,
          renderOptions(true),
        );
        const png = await canvasToPng(canvas);
        entries.push({ name: pageName(i, "png"), data: png });
        exportProgress.value = i + 1;
      }
      const zip = await buildZip(
        entries,
        () => cancelFlag,
        (done) => (exportProgress.value = done),
      );
      if (cancelFlag) throw new CancelledError();
      download(zip, exportName(doc.asset?.name ?? "art", "zip"));
      notice.value = `分页 PNG 打包完成，共 ${entries.length} 张`;
    } catch (e) {
      if (e instanceof CancelledError) notice.value = "已取消导出，未生成任何文件";
      else notice.value = e instanceof Error ? e.message : "ZIP 生成失败";
    } finally {
      entries.length = 0;
      canvas.width = 0;
      canvas.height = 0;
      exporting.value = false;
      exportProgress.value = 0;
    }
  }

  function cancel() {
    if (exporting.value) {
      cancelFlag = true;
      notice.value = "正在取消…";
    }
  }

  return {
    doc,
    busy,
    layout,
    stale,
    activePage,
    currentPage,
    clampPage,
    go,
    exporting,
    exportProgress,
    exportTotal,
    exportPdf,
    exportZip,
    cancel,
    PREVIEW_DPI,
  };
}
