import React from 'react';
import ReactDOM from 'react-dom/client';

import { ThemeProvider } from '@/components/theme-provider';
import { getSettings } from '@/lib/settings';

import App from './App';
import './style.css';

async function applyTheme() {
  const { theme } = await getSettings();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);
}

void applyTheme().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>,
  );
});
