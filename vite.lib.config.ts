import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// UI kit library build (src/ui) for Claude Design sync. Styles ship separately as src/ui/styles.css.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/ui',
    emptyOutDir: true,
    lib: { entry: 'src/ui/index.ts', formats: ['es'], fileName: 'index' },
    rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime'] },
  },
})
