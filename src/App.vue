<template>
  <main class="page">
    <section class="controls-card">
      <h1>Lights Out</h1>
      <div class="dimension-selector">
        <label class="dimension-label">矩阵维度</label>
        <div class="dimension-inputs">
          <input type="number" v-model.number="x" min="1" max="6" step="1" inputmode="numeric" aria-label="列数"
            @change="syncDimensions" />
          <span class="dimension-multiply">&times;</span>
          <input type="number" v-model.number="y" min="1" max="6" step="1" inputmode="numeric" aria-label="行数"
            @change="syncDimensions" />
        </div>
      </div>
      <label class="live-toggle">
        <input type="checkbox" v-model="live" />
        <span class="toggle-visual" aria-hidden="true">
          <span class="toggle-thumb"></span>
        </span>
        <span class="toggle-text">实时求解</span>
      </label>
      <button type="button" class="primary" @click="getSolution">求解</button>
    </section>

    <section class="boards">
      <article class="board-panel">
        <header>
          <h2>初始棋盘</h2>
          <p>点击方块切换状态</p>
        </header>
        <div class="gameboard">
          <div class="board-grid">
            <div v-for="(row, i) in A" :key="'A-' + i" class="board-row">
              <label v-for="(cell, j) in row" :key="'A-cell-' + i + '-' + j" :id="'A-' + i + '-' + j" class="board-cell"
                @click="cellChange(i, j)" :state="A[i][j] == 0 ? 'off' : A[i][j] == -1 ? 'none' : 'on'"></label>
            </div>
          </div>
        </div>
      </article>

      <article class="board-panel">
        <header>
          <h2>求解结果</h2>
          <p v-if="!noSolution">蓝色代表需要翻转</p>
          <p v-if="!noSolution && !unique">本题解不唯一</p>
          <p v-if="noSolution">本题无解</p>
        </header>
        <div class="gameboard answer">
          <div class="board-grid">
            <div v-for="(row, i) in B" :key="'B-' + i" class="board-row">
              <label v-for="(cell, j) in row" :key="'B-cell-' + i + '-' + j" :id="'B-' + i + '-' + j" class="board-cell"
                :state="B[i][j] == 0 ? 'off' : B[i][j] == -1 ? 'none' : 'on'"></label>
            </div>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<script setup>
import { ref, watch } from 'vue'
const x = ref(3)
const y = ref(3)
const A = ref([])
const B = ref([])
const live = ref(false)

const unique = ref(true)
const noSolution = ref(false)

const DIMENSION_MIN = 1
const DIMENSION_MAX = 6

const clampDimension = value => {
  if (!Number.isFinite(value)) {
    return DIMENSION_MIN
  }
  return Math.min(DIMENSION_MAX, Math.max(DIMENSION_MIN, Math.round(value)))
}

const createMatrix = (rows, cols, fill) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill))

const solve = Q => {
  var lights = new Map()
  for (var j = 0; j < y.value; j++) {
    for (var i = 0; i < x.value; i++) {
      if (Q[j][i] !== -1) {
        lights.set([j, i].join(' '), Q[j][i])
      }
    }
  }

  var matrix = Array.from({ length: lights.size }, () =>
    Array.from({ length: lights.size }, () => 0)
  )
  var dst = Array.from(lights.values(), v => v ^ 1)
  var pos = Array.from(lights.keys())
  pos.forEach((key1, index1) => {
    var [x, y] = key1.split(' ').map(Number)
    pos.forEach((key2, index2) => {
      var [a, b] = key2.split(' ').map(Number)
      if (x === a && y === b) {
        matrix[index1][index2] = 1
      } else if (x === a && Math.abs(y - b) === 1) {
        matrix[index1][index2] = 1
      } else if (y === b && Math.abs(x - a) === 1) {
        matrix[index1][index2] = 1
      }
    })
  })

  // Gaussian elimination
  for (var j = 0; j < matrix.length; j++) {
    //find pivot
    for (var pivot = j; pivot < matrix.length; pivot++) {
      if (matrix[pivot][j] === 1) break;
    }
    if (pivot === matrix.length) continue; //no pivot in this column
    //swap rows
    if (pivot !== j) {
      [matrix[pivot], matrix[j]] = [matrix[j], matrix[pivot]];
      [dst[pivot], dst[j]] = [dst[j], dst[pivot]];
    }
    //eliminate below
    for (var jj = j + 1; jj < matrix.length; jj++) {
      if (matrix[jj][j] === 1) {
        for (var k = j; k < matrix.length; k++) {
          matrix[jj][k] ^= matrix[j][k];
        }
        dst[jj] ^= dst[j];
      }
    }
  }
  //back substitution
  for (var j = matrix.length - 1; j >= 0; j--) {
    for (var jj = j - 1; jj >= 0; jj--) {
      if (matrix[jj][j] === 1) {
        for (var k = j; k < matrix.length; k++) {
          matrix[jj][k] ^= matrix[j][k];
        }
        dst[jj] ^= dst[j];
      }
    }
  }
  //check for the uniqueness
  unique.value = true
  noSolution.value = false
  for (var j = 0; j < matrix.length; j++) {
    var allZero = true
    for (var k = 0; k < matrix.length; k++) {
      if (matrix[j][k] !== 0) {
        allZero = false
        break
      }
    }
    if (allZero && dst[j] === 1) {
      //no solution
      noSolution.value = true
      return createMatrix(y.value, x.value, -1)
    } else if (allZero && dst[j] === 0) {
      //no unique
      unique.value = false
    }
  }

  var result = createMatrix(y.value, x.value, -1)
  lights.keys().forEach((key, index) => {
    var [i, j] = key.split(' ').map(Number)
    result[i][j] = dst[index]
  })
  return result
}

const getSolution = () => {
  B.value = solve(A.value)
}

const initializeMatrices = () => {
  A.value = createMatrix(y.value, x.value, 0)
  B.value = live.value ? solve(A.value) : createMatrix(y.value, x.value, 0)
}

const syncDimensions = () => {
  x.value = clampDimension(Number(x.value))
  y.value = clampDimension(Number(y.value))
  initializeMatrices()
}

const cellChange = (i, j) => {
  if (A.value[i][j] === 0) {
    A.value[i][j] = 1
  } else if (A.value[i][j] === 1) {
    A.value[i][j] = -1
  } else {
    A.value[i][j] = 0
  }
  if (live.value) {
    B.value = solve(A.value)
  }
}

watch(live, value => {
  B.value = value ? solve(A.value) : createMatrix(y.value, x.value, 0)
})

initializeMatrices()
</script>

<style>
:root {
  --vt-c-white: #ffffff;
  --vt-c-white-soft: #f8f8f8;
  --vt-c-white-mute: #f2f2f2;

  --vt-c-black: #181818;
  --vt-c-black-soft: #222222;
  --vt-c-black-mute: #282828;

  --vt-c-indigo: #2c3e50;

  --vt-c-divider-light-1: rgba(60, 60, 60, 0.29);
  --vt-c-divider-light-2: rgba(60, 60, 60, 0.12);
  --vt-c-divider-dark-1: rgba(84, 84, 84, 0.65);
  --vt-c-divider-dark-2: rgba(84, 84, 84, 0.48);

  --vt-c-text-light-1: var(--vt-c-indigo);
  --vt-c-text-light-2: rgba(60, 60, 60, 0.66);
  --vt-c-text-dark-1: var(--vt-c-white);
  --vt-c-text-dark-2: rgba(235, 235, 235, 0.64);
}

:root {
  --color-background: var(--vt-c-white);
  --color-background-soft: var(--vt-c-white-soft);
  --color-background-mute: var(--vt-c-white-mute);

  --color-border: var(--vt-c-divider-light-2);
  --color-border-hover: var(--vt-c-divider-light-1);

  --color-heading: var(--vt-c-text-light-1);
  --color-text: var(--vt-c-text-light-1);

  --section-gap: 160px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: var(--vt-c-black);
    --color-background-soft: var(--vt-c-black-soft);
    --color-background-mute: var(--vt-c-black-mute);

    --color-border: var(--vt-c-divider-dark-2);
    --color-border-hover: var(--vt-c-divider-dark-1);

    --color-heading: var(--vt-c-text-dark-1);
    --color-text: var(--vt-c-text-dark-2);
  }
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  font-weight: normal;
}

body {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 2rem 0 3rem;
  color: var(--color-text);
  background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 45%, #e0f2fe 100%);
  transition: color 0.5s, background-color 0.5s;
  line-height: 1.6;
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
    Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: 15px;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@media (prefers-color-scheme: dark) {
  body {
    background: var(--color-background);
  }
}

#app {
  width: min(100%, 1200px);
  font-weight: normal;
}
</style>

<style scoped>
.page {
  display: grid;
  gap: 2rem;
  padding: 2.5rem 1.5rem 3.5rem;
  width: min(100%, 960px);
  margin: 0 auto;
}

.controls-card {
  display: grid;
  gap: 1.5rem;
  padding: 1.75rem;
  background: linear-gradient(135deg, rgba(76, 201, 240, 0.15), rgba(67, 97, 238, 0.15));
  border-radius: 18px;
  backdrop-filter: blur(4px);
  box-shadow: 0 18px 32px rgba(31, 38, 135, 0.12);
}

.controls-card h1 {
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-align: center;
}

.dimension-selector {
  display: grid;
  gap: 0.75rem;
}

.dimension-label {
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  color: rgba(24, 24, 24, 0.7);
  letter-spacing: 0.08em;
}

.dimension-inputs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.dimension-inputs input {
  width: 4rem;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
  border-radius: 12px;
  border: 1px solid rgba(24, 24, 24, 0.18);
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 14px rgba(67, 97, 238, 0.08);
  cursor: text;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.dimension-inputs input:focus-visible {
  outline: 3px solid rgba(76, 201, 240, 0.35);
  border-color: rgba(67, 97, 238, 0.55);
  box-shadow: 0 0 0 6px rgba(67, 97, 238, 0.12);
}

:deep(.dimension-inputs input::-webkit-outer-spin-button),
:deep(.dimension-inputs input::-webkit-inner-spin-button) {
  margin: 0;
}

:deep(.dimension-inputs input[type='number']) {
  appearance: textfield;
  -moz-appearance: textfield;
}

.dimension-multiply {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(24, 24, 24, 0.7);
}

.live-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(24, 24, 24, 0.75);
  cursor: pointer;
  user-select: none;
}

.live-toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.live-toggle .toggle-visual {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  width: 48px;
  height: 26px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.45);
  box-shadow: inset 0 2px 4px rgba(15, 23, 42, 0.2);
  transition: background-color 0.25s ease, box-shadow 0.25s ease;
}

.live-toggle .toggle-thumb {
  position: absolute;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 4px 10px rgba(67, 97, 238, 0.28);
  transition: transform 0.25s ease;
}

.live-toggle .toggle-text {
  color: rgba(24, 24, 24, 0.75);
}

.live-toggle input:checked+.toggle-visual {
  background: linear-gradient(135deg, #4361ee, #4cc9f0);
  box-shadow: inset 0 2px 6px rgba(15, 23, 42, 0.21);
}

.live-toggle input:checked+.toggle-visual .toggle-thumb {
  transform: translateX(22px);
}

.live-toggle input:focus-visible+.toggle-visual {
  box-shadow: 0 0 0 4px rgba(76, 201, 240, 0.3);
}

.live-toggle:hover .toggle-visual {
  box-shadow: inset 0 2px 6px rgba(15, 23, 42, 0.24);
}

.primary {
  padding: 0.75rem 1.75rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #4361ee, #4cc9f0);
  color: #ffffff;
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.04em;
  border: none;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(67, 97, 238, 0.25);
}

.boards {
  display: grid;
  gap: 2rem;
}

.board-panel {
  display: grid;
  gap: 1.25rem;
  padding: 1.75rem;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 20px;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.12);
  border: 1px solid rgba(67, 97, 238, 0.1);
}

.board-panel header {
  display: grid;
  gap: 0.35rem;
}

.board-panel h2 {
  font-size: 1.3rem;
  font-weight: 600;
}

.board-panel p {
  font-size: 0.9rem;
  color: rgba(24, 24, 24, 0.65);
}

.gameboard {
  display: flex;
  justify-content: center;
}

.board-grid {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  align-items: center;
}

.board-row {
  display: flex;
  gap: 0.55rem;
}

.board-cell {
  width: min(50px, 11vw);
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid rgba(24, 24, 24, 0.12);
  background: rgba(229, 231, 235, 0.65);
  cursor: pointer;
  transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
}

.board-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(67, 97, 238, 0.18);
}

.board-cell[state="on"] {
  background: linear-gradient(135deg, #4cc9f0, #4361ee);
  border-color: rgba(67, 97, 238, 0.45);
}

.board-cell[state="none"] {
  background: rgba(229, 231, 235, 0.35);
  border-style: dashed;
  border-color: rgba(148, 163, 184, 0.8);
}

.board-cell[state="off"] {
  background: linear-gradient(135deg, #475569, #1e293b);
  color: rgba(255, 255, 255, 0.85);
  border-color: rgba(30, 41, 59, 0.55);
}

/* .board-cell[state="any"] {
  background: linear-gradient(135deg, #bbf7d0, #34d399);
  border-color: rgba(22, 101, 52, 0.4);
  box-shadow: 0 12px 22px rgba(30, 64, 38, 0.18);
  color: rgba(22, 44, 33, 0.9);
} */

.answer .board-cell {
  cursor: default;
  pointer-events: none;
}

@media (min-width: 700px) {
  .boards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 540px) {
  .controls-card {
    padding: 1.5rem;
  }

  .board-panel {
    padding: 1.5rem;
  }

  .board-cell {
    width: min(44px, 18vw);
  }
}

@media (prefers-reduced-motion: reduce) {

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
</style>