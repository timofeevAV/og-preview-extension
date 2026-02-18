export interface OgPreviewSettings {
  hoverPreview: boolean;
  defaultTab: 'previews' | 'metadata';
  hoverDelay: number; // ms, 0–2000
  theme: 'system' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: OgPreviewSettings = {
  hoverPreview: false,
  defaultTab: 'previews',
  hoverDelay: 300,
  theme: 'system',
};

const STORAGE_KEY = 'ogPreviewSettings';

/** Read settings from chrome.storage.sync, filling in defaults for missing keys. */
export async function getSettings(): Promise<OgPreviewSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_SETTINGS }, (result) => {
      resolve({
        ...DEFAULT_SETTINGS,
        ...(result[STORAGE_KEY] as Partial<OgPreviewSettings>),
      });
    });
  });
}

/** Persist a single setting value. */
export async function setSetting<K extends keyof OgPreviewSettings>(
  key: K,
  value: OgPreviewSettings[K],
): Promise<void> {
  const current = await getSettings();
  return new Promise((resolve) => {
    chrome.storage.sync.set(
      { [STORAGE_KEY]: { ...current, [key]: value } },
      resolve,
    );
  });
}

/**
 * Subscribe to settings changes.
 * Returns an unsubscribe function.
 */
export function onSettingsChanged(
  cb: (changes: Partial<OgPreviewSettings>) => void,
): () => void {
  const listener = (
    rawChanges: { [key: string]: chrome.storage.StorageChange },
    area: string,
  ) => {
    if (area !== 'sync') return;
    if (!rawChanges[STORAGE_KEY]) return;
    const next = rawChanges[STORAGE_KEY].newValue as OgPreviewSettings;
    const prev = rawChanges[STORAGE_KEY].oldValue as
      | OgPreviewSettings
      | undefined;
    const diff: Partial<OgPreviewSettings> = {};
    (Object.keys(next) as (keyof OgPreviewSettings)[]).forEach((k) => {
      if (!prev || next[k] !== prev[k])
        (diff as Record<string, unknown>)[k] = next[k];
    });
    if (Object.keys(diff).length > 0) cb(diff);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
