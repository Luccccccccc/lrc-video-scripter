
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

// Fix for __dirname not defined in ESM environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 简单插件：将 manifest.json 从根目录复制到 dist 目录
const copyManifest = () => {
  return {
    name: 'copy-manifest',
    closeBundle() {
      const manifestPath = resolve(__dirname, 'manifest.json');
      const distDir = resolve(__dirname, 'dist');
      const distPath = resolve(distDir, 'manifest.json');
      
      if (existsSync(manifestPath)) {
        if (!existsSync(distDir)) {
          mkdirSync(distDir);
        }
        writeFileSync(distPath, readFileSync(manifestPath));
        console.log('\x1b[32m%s\x1b[0m', '✓ manifest.json 成功复制到 dist 目录');
      }
    }
  };
};

export default defineConfig({
  plugins: [react(), copyManifest()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'background.ts'),
      },
      output: {
        // 保持文件名固定，方便 manifest.json 引用
        entryFileNames: `[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
});
