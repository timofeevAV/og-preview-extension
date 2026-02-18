import { useEffect, useState } from 'react';

import type { OgPreviewSettings } from '@/lib/settings';
import type { OgData } from '@/lib/types';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import { sendMessage } from '@/lib/messaging';
import { getOgDataStatus } from '@/lib/og-display';
import { DEFAULT_SETTINGS, getSettings, setSetting } from '@/lib/settings';

import { CompactCard } from './components/CompactCard';
import { EmptyState } from './components/EmptyState';
import { MetadataTab } from './components/MetadataTab';
import { OgCardSkeleton } from './components/OgCardSkeleton';
import { PreviewsTab } from './components/PreviewsTab';
import { SettingsPage } from './components/SettingsPage';
import { Toolbar } from './components/Toolbar';

export default function App() {
  const [ogData, setOgData] = useState<OgData | null | undefined>(undefined); // undefined = loading
  const [activeTab, setActiveTab] = useState('');
  const [view, setView] = useState<'main' | 'settings'>('main');
  const [settings, setSettings] = useState<OgPreviewSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    async function load() {
      try {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab?.id) {
          setOgData(null);
          return;
        }
        const [data, loadedSettings] = await Promise.all([
          sendMessage('getPageOgData', { tabId: tab.id }),
          getSettings(),
        ]);
        setOgData(data ?? null);
        setSettings(loadedSettings);
      } catch {
        setOgData(null);
      }
    }
    void load();
  }, []);

  async function updateSetting<K extends keyof OgPreviewSettings>(
    key: K,
    value: OgPreviewSettings[K],
  ) {
    await setSetting(key, value);
    if (key === 'theme') {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;
      const isDark = value === 'dark' || (value === 'system' && prefersDark);
      document.documentElement.classList.toggle('dark', isDark);
    }
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  // Settings view — full replacement, no toolbar
  if (view === 'settings') {
    return (
      <SettingsPage
        settings={settings}
        onUpdate={updateSetting}
        onBack={() => {
          setView('main');
        }}
      />
    );
  }

  const status = ogData !== undefined ? getOgDataStatus(ogData) : null;
  const hasData = status === 'partial' || status === 'complete';

  return (
    <div className="w-[380px]">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <Toolbar
          settings={settings}
          activeTab={activeTab}
          onToggleHoverPreview={() =>
            updateSetting('hoverPreview', !settings.hoverPreview)
          }
          onChangeTheme={(theme) => updateSetting('theme', theme)}
          onOpenSettings={() => {
            setView('settings');
          }}
          onCollapse={() => {
            setActiveTab('');
          }}
        />

        {/* Loading state */}
        {ogData === undefined && <OgCardSkeleton />}

        {/* Error state */}
        {status === 'error' && <EmptyState variant="error" />}

        {/* Empty state */}
        {status === 'empty' && <EmptyState variant="empty" />}

        {/* Data states: partial or complete */}
        {ogData && hasData && <CompactCard ogData={ogData} />}

        {/* Tab content — renders only when data is available and a tab is active */}
        {ogData && hasData && (
          <>
            <TabsContent
              value="previews"
              className="mt-0"
            >
              <PreviewsTab ogData={ogData} />
            </TabsContent>
            <TabsContent
              value="metadata"
              className="mt-0"
            >
              <MetadataTab ogData={ogData} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
