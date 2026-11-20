<script setup lang="ts">
import { computed } from "vue";
import { Newspaper, RotateCcw, TriangleAlert } from "lucide-vue-next";
import { useStudio } from "../../../shared/useStudio";
import { PAPERS, MIN_PAPER_MM, MAX_PAPER_MM, MIN_FONT_PT, MAX_FONT_PT } from "../lib/papers";
import { usePoster } from "../model/usePoster";

const { doc } = useStudio();
const p = usePoster();
const poster = doc.poster;

const number = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fitStats = computed(() => {
  const l = p.layout.value;
  if (l.error || l.pages.length === 0) return null;
  return {
    sheets: `${l.tileCols} × ${l.tileRows} = ${l.pageCount} 张`,
    font: `${l.fontPt.toFixed(1)} pt`,
    pitch: `${l.cellWidthMm.toFixed(2)} × ${l.lineHeightMm.toFixed(2)} mm/字`,
    capacity: `${l.colsPerPage} 列 × ${l.rowsPerPage} 行/页`,
    overlap: `${l.overlapCols} 列 / ${l.overlapRows} 行`,
    size: `${l.posterWidthMm.toFixed(1)} × ${l.posterHeightMm.toFixed(1)} mm`,
  };
});

function resetPoster() {
  poster.paperId = "A4";
  poster.customWidthMm = 210;
  poster.customHeightMm = 297;
  poster.landscape = false;
  poster.marginMm = 12;
  poster.overlapMm = 12;
  poster.marks = true;
  poster.fit = "font";
  poster.fontPt = 10;
  poster.targetWidthMm = 800;
  poster.targetHeightMm = 600;
  poster.maxSheets = 36;
  poster.mono = false;
  poster.whiteBg = false;
  poster.guides = true;
}
</script>

<template>
  <section class="panel poster-panel">
    <div class="section-title"><span>04 / POSTER PRESS</span><Newspaper :size="15" /></div>

    <label class="field"
      >纸张尺寸
      <select aria-label="纸张尺寸" v-model="poster.paperId">
        <option v-for="pa in PAPERS" :key="pa.id" :value="pa.id">{{ pa.name }}</option>
      </select></label
    >
    <div v-if="poster.paperId === 'CUSTOM'" class="pair">
      <label class="mini-field"
        >宽 mm
        <input
          type="number"
          :min="MIN_PAPER_MM"
          :max="MAX_PAPER_MM"
          :value="poster.customWidthMm"
          @input="poster.customWidthMm = number(($event.target as HTMLInputElement).value)"
      /></label>
      <label class="mini-field"
        >高 mm
        <input
          type="number"
          :min="MIN_PAPER_MM"
          :max="MAX_PAPER_MM"
          :value="poster.customHeightMm"
          @input="poster.customHeightMm = number(($event.target as HTMLInputElement).value)"
      /></label>
    </div>
    <div class="row hint">
      <span>纸张 {{ p.layout.value.paperWidthMm.toFixed(0) }} × {{ p.layout.value.paperHeightMm.toFixed(0) }} mm</span>
      <button class="icon-button" aria-label="恢复海报默认设置" @click="resetPoster">
        <RotateCcw :size="13" />
      </button>
    </div>

    <label class="field"
      >页边距 <b>{{ poster.marginMm }} mm</b
      ><input
        aria-label="页边距"
        type="range"
        min="0"
        max="40"
        step="1"
        v-model.number="poster.marginMm"
    /></label>
    <label class="field"
      >拼接重叠 <b>{{ poster.overlapMm }} mm</b
      ><input
        aria-label="拼接重叠"
        type="range"
        min="0"
        max="50"
        step="1"
        v-model.number="poster.overlapMm"
    /></label>
    <div class="range-ends"><span>无缝拼接</span><span>更易对位</span></div>

    <div class="check-list">
      <label class="toggle-row compact"
        ><span>横向纸张</span
        ><input aria-label="横向纸张" type="checkbox" v-model="poster.landscape"
      /></label>
      <label class="toggle-row compact"
        ><span>裁切标记与页序</span
        ><input aria-label="裁切标记" type="checkbox" v-model="poster.marks"
      /></label>
      <label class="toggle-row compact"
        ><span>预览重叠辅助线</span
        ><input aria-label="重叠辅助线" type="checkbox" v-model="poster.guides"
      /></label>
    </div>

    <div class="fit-mode" role="radiogroup" aria-label="分页约束模式">
      <button
        :class="{ active: poster.fit === 'font' }"
        role="radio"
        :aria-checked="poster.fit === 'font'"
        @click="poster.fit = 'font'"
      >
        固定字号
      </button>
      <button
        :class="{ active: poster.fit === 'poster' }"
        role="radio"
        :aria-checked="poster.fit === 'poster'"
        @click="poster.fit = 'poster'"
      >
        固定海报尺寸
      </button>
    </div>

    <template v-if="poster.fit === 'font'">
      <label class="field"
        >字号 <b>{{ poster.fontPt }} pt</b
        ><input
          aria-label="字号"
          type="range"
          :min="MIN_FONT_PT"
          :max="MAX_FONT_PT"
          step="0.5"
          v-model.number="poster.fontPt"
      /></label>
    </template>
    <template v-else>
      <div class="pair">
        <label class="mini-field"
          >目标宽 mm
          <input
            type="number"
            min="50"
            max="20000"
            :value="poster.targetWidthMm"
            @input="poster.targetWidthMm = number(($event.target as HTMLInputElement).value)"
        /></label>
        <label class="mini-field"
          >目标高 mm
          <input
            type="number"
            min="50"
            max="20000"
            :value="poster.targetHeightMm"
            @input="poster.targetHeightMm = number(($event.target as HTMLInputElement).value)"
        /></label>
      </div>
    </template>

    <label class="field"
      >纸张数上限 <b>{{ poster.maxSheets }} 张</b
      ><input
        aria-label="纸张数上限"
        type="range"
        min="1"
        max="120"
        step="1"
        v-model.number="poster.maxSheets"
    /></label>

    <div class="check-list">
      <label class="toggle-row compact"
        ><span>单色打印（不改变分页）</span
        ><input aria-label="单色打印" type="checkbox" v-model="poster.mono"
      /></label>
      <label class="toggle-row compact"
        ><span>白底省墨</span
        ><input aria-label="白底省墨" type="checkbox" v-model="poster.whiteBg"
      /></label>
    </div>

    <div v-if="fitStats" class="poster-stats">
      <div><span>用纸</span><b>{{ fitStats.sheets }}</b></div>
      <div><span>实际字号</span><b>{{ fitStats.font }}</b></div>
      <div><span>字符格</span><b>{{ fitStats.pitch }}</b></div>
      <div><span>每页容量</span><b>{{ fitStats.capacity }}</b></div>
      <div><span>实际重叠</span><b>{{ fitStats.overlap }}</b></div>
      <div><span>成品尺寸</span><b>{{ fitStats.size }}</b></div>
      <div
        v-if="p.layout.value.deviationWidthMm !== null && p.layout.value.deviationHeightMm !== null"
      >
        <span>目标偏差</span>
        <b :class="{ bad: (p.layout.value.deviationWidthMm ?? 0) > 0.5 || (p.layout.value.deviationHeightMm ?? 0) > 0.5 }">
          {{ (p.layout.value.deviationWidthMm ?? 0) >= 0 ? "+" : "" }}{{ (p.layout.value.deviationWidthMm ?? 0).toFixed(1) }} /
          {{ (p.layout.value.deviationHeightMm ?? 0) >= 0 ? "+" : "" }}{{ (p.layout.value.deviationHeightMm ?? 0).toFixed(1) }} mm
        </b>
      </div>
    </div>

    <ul v-if="p.layout.value.warnings.length" class="poster-warn-list">
      <li v-for="(w, i) in p.layout.value.warnings" :key="i">
        <TriangleAlert :size="11" /> {{ w }}
      </li>
    </ul>
    <div v-if="p.stale.value" class="poster-stale">分页已失效 · 等待字符布局重新生成…</div>
  </section>
</template>
