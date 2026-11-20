<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { ChevronLeft, ChevronRight, Layers } from "lucide-vue-next";
import { usePoster, PREVIEW_DPI } from "../model/usePoster";
import { renderPage } from "../lib/render";

const p = usePoster();
const canvas = ref<HTMLCanvasElement>();

function draw() {
  if (!canvas.value || !p.doc.grid || !p.currentPage.value) return;
  renderPage(canvas.value, p.doc.grid, p.layout.value, p.currentPage.value, {
    dpi: PREVIEW_DPI,
    color: p.doc.settings.color,
    mono: p.doc.poster.mono,
    background: p.doc.settings.background,
    whiteBg: p.doc.poster.whiteBg,
    marks: p.doc.poster.marks,
    guides: p.doc.poster.guides,
    guidesForPrint: false,
  });
}

onMounted(draw);
watch(
  () => [
    p.currentPage.value,
    p.layout.value,
    p.doc.settings.color,
    p.doc.settings.background,
    p.doc.poster.mono,
    p.doc.poster.whiteBg,
    p.doc.poster.marks,
    p.doc.poster.guides,
    p.doc.grid,
  ],
  draw,
  { deep: false },
);
watch(
  () => p.layout.value.pages.length,
  () => p.clampPage(),
);
</script>

<template>
  <div class="poster-preview">
    <div class="poster-stage">
      <canvas
        v-if="p.currentPage.value && p.doc.grid && !p.stale.value"
        ref="canvas"
        class="poster-page"
        aria-label="海报分页预览"
      />
      <div v-else-if="p.stale.value" class="poster-placeholder">
        <Layers :size="22" />
        <span>字符布局更新中，旧分页已失效…</span>
      </div>
      <div v-else class="poster-placeholder">
        <Layers :size="22" />
        <span>载入图片后生成分页预览</span>
      </div>
    </div>

    <div class="poster-nav" v-if="p.layout.value.pages.length">
      <button
        class="nav-btn"
        aria-label="上一页"
        :disabled="p.activePage.value === 0"
        @click="p.go(p.activePage.value - 1)"
      >
        <ChevronLeft :size="15" />
      </button>
      <div class="page-meta">
        <strong
          >第 {{ (p.currentPage.value?.pageNo ?? 0) }} /
          {{ p.layout.value.pageCount }} 页</strong
        >
        <small v-if="p.currentPage.value"
          >拼贴 {{ p.currentPage.value.tileCol + 1 }}-{{
            p.currentPage.value.tileRow + 1
          }}
          · 本页 {{ p.currentPage.value.cols }}×{{ p.currentPage.value.rows }}
          字符 · 网格起点 ({{ p.currentPage.value.x0 }},
          {{ p.currentPage.value.y0 }})</small
        >
      </div>
      <button
        class="nav-btn"
        aria-label="下一页"
        :disabled="p.activePage.value >= p.layout.value.pages.length - 1"
        @click="p.go(p.activePage.value + 1)"
      >
        <ChevronRight :size="15" />
      </button>
    </div>

    <div
      class="tile-map"
      v-if="p.layout.value.pages.length"
      :style="{ gridTemplateColumns: `repeat(${p.layout.value.tileCols}, 30px)` }"
    >
      <button
        v-for="pg in p.layout.value.pages"
        :key="pg.index"
        class="tile-cell"
        :class="{ active: pg.index === p.activePage.value }"
        :aria-label="`第 ${pg.pageNo} 页`"
        :style="{
          gridColumn: pg.tileCol + 1,
          gridRow: pg.tileRow + 1,
        }"
        @click="p.go(pg.index)"
      >
        {{ pg.pageNo }}
      </button>
    </div>
    <p class="poster-tip" v-if="p.layout.value.pages.length">
      蓝色区域为与相邻页重复的重叠带，虚线为实际裁切线；沿标记裁切后按页序拼接即可还原完整字符画，任何字符都不会被页缝切开。
    </p>
  </div>
</template>
