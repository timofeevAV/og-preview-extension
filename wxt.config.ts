import path from 'path';
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  }),
  manifest: {
    name: 'OG Preview',
    description: 'Preview Open Graph cards for any webpage or link',
    version: '0.1.0',
    permissions: ['activeTab', 'storage', 'clipboardWrite', 'downloads'],
    host_permissions: ['<all_urls>'],
  },
});
