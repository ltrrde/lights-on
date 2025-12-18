import { fileURLToPath, URL } from 'node:url'

import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const plugins: PluginOption[] = [vue()]

  if (command === 'serve') {
    plugins.push(vueDevTools())
  }

  if (command === 'build') {
    plugins.push(viteSingleFile())
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
  }
})
