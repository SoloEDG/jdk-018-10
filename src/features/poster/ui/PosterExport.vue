<script setup lang="ts">
import { FileDown, FileArchive, X, Printer } from "lucide-vue-next";
import { usePoster, EXPORT_DPI } from "../model/usePoster";
const p = usePoster();
</script>

<template>
  <section class="panel poster-export">
    <div class="section-title"><span>05 / PRINT EXPORT</span><Printer :size="15" /></div>
    <p class="export-note">
      PDF 按 {{ EXPORT_DPI }} DPI 逐页排版，含裁切标记与页序；ZIP 内含逐页 PNG。
      彩色与单色仅改变墨色，字符占位与分页边界完全一致。
    </p>

    <div v-if="p.exporting.value" class="export-progress">
      <div class="progress-bar">
        <span
          :style="{
            width: (p.exportProgress.value / Math.max(1, p.exportTotal.value)) * 100 + '%',
          }"
        />
      </div>
      <small class="mono"
        >正在渲染第 {{ p.exportProgress.value }} / {{ p.exportTotal.value }} 页…</small
      >
      <button class="secondary danger" @click="p.cancel">
        <X :size="14" /> 取消（不保留缺页文件）
      </button>
    </div>

    <div v-else class="poster-export-actions">
      <button
        class="primary"
        :disabled="p.stale.value || p.layout.value.pages.length === 0"
        @click="p.exportPdf"
      >
        <FileDown :size="15" /> 下载打印 PDF
        <small>{{ p.layout.value.pageCount || 0 }} 页</small>
      </button>
      <button
        class="secondary"
        :disabled="p.stale.value || p.layout.value.pages.length === 0"
        @click="p.exportZip"
      >
        <FileArchive :size="15" /> 逐页 PNG (ZIP)
      </button>
    </div>

    <small v-if="p.stale.value" class="stale-hint"
      >当前分页与字符布局不同步，请等待重新生成后再下载</small
    >
  </section>
</template>
