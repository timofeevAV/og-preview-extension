import { useState, useRef } from 'react';

import type { OgData } from '@/lib/types';

import { ALL_OG_FIELDS } from '@/lib/og-display';

interface MetadataTabProps {
  ogData: OgData;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function generateMetaSnippets(ogData: OgData): string {
  return ALL_OG_FIELDS.map((f) => {
    const value = ogData[f.key];
    const attr = f.label.startsWith('twitter:') ? 'name' : 'property';
    if (value !== undefined) {
      return `<meta ${attr}="${f.label}" content="${escapeAttr(value)}" />`;
    } else if (f.required) {
      return `<!-- missing: <meta ${attr}="${f.label}" content="TODO" /> -->`;
    }
    return null;
  })
    .filter((line): line is string => line !== null)
    .join('\n');
}

export function MetadataTab({ ogData }: MetadataTabProps) {
  // Show all fields that are either present or required (missing required get indicator)
  const visibleFields = ALL_OG_FIELDS.filter(
    (f) => ogData[f.key] !== undefined || f.required,
  );

  const [copyJsonState, setCopyJsonState] = useState<
    'idle' | 'copied' | 'error'
  >('idle');
  const [copySnippetsState, setCopySnippetsState] = useState<
    'idle' | 'copied' | 'error'
  >('idle');
  const copyJsonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copySnippetsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  async function handleCopyJson() {
    const json = JSON.stringify(ogData, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      if (copyJsonTimerRef.current) clearTimeout(copyJsonTimerRef.current);
      setCopyJsonState('copied');
      copyJsonTimerRef.current = setTimeout(() => {
        setCopyJsonState('idle');
      }, 2000);
    } catch {
      setCopyJsonState('error');
      if (copyJsonTimerRef.current) clearTimeout(copyJsonTimerRef.current);
      copyJsonTimerRef.current = setTimeout(() => {
        setCopyJsonState('idle');
      }, 2000);
    }
  }

  function handleDownloadJson() {
    const json = JSON.stringify(ogData, null, 2);
    const dataUrl =
      'data:application/json;charset=utf-8,' + encodeURIComponent(json);
    void chrome.downloads.download({
      url: dataUrl,
      filename: 'og-metadata.json',
    });
  }

  async function handleCopySnippets() {
    const snippets = generateMetaSnippets(ogData);
    try {
      await navigator.clipboard.writeText(snippets);
      if (copySnippetsTimerRef.current)
        clearTimeout(copySnippetsTimerRef.current);
      setCopySnippetsState('copied');
      copySnippetsTimerRef.current = setTimeout(() => {
        setCopySnippetsState('idle');
      }, 2000);
    } catch {
      setCopySnippetsState('error');
      if (copySnippetsTimerRef.current)
        clearTimeout(copySnippetsTimerRef.current);
      copySnippetsTimerRef.current = setTimeout(() => {
        setCopySnippetsState('idle');
      }, 2000);
    }
  }

  const btnBase =
    'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium border border-border bg-background hover:bg-muted transition-colors';

  return (
    <div className="space-y-4 px-3 py-3">
      {/* Unified metadata table — present values + missing required indicators */}
      <section>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          Metadata
        </p>
        {visibleFields.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No metadata found on this page.
          </p>
        ) : (
          <div className="divide-y divide-border rounded border border-border">
            {visibleFields.map((f) => {
              const value = ogData[f.key];
              const isMissing = value === undefined;
              return (
                <div
                  key={f.key}
                  className="flex items-baseline gap-2 px-2 py-1.5"
                >
                  <span className="w-[132px] shrink-0 truncate font-mono text-[10px] text-muted-foreground">
                    {f.label}
                  </span>
                  {isMissing ? (
                    <span className="text-[11px] text-muted-foreground/50 italic">
                      missing
                    </span>
                  ) : (
                    <span className="min-w-0 truncate text-[11px] text-foreground">
                      {value}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 3: Export actions — META-03, META-04, META-05 */}
      <section>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          Export
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopyJson}
            className={btnBase}
          >
            {copyJsonState === 'copied'
              ? 'Copied!'
              : copyJsonState === 'error'
                ? 'Failed'
                : 'Copy JSON'}
          </button>
          <button
            onClick={handleDownloadJson}
            className={btnBase}
          >
            Download JSON
          </button>
          <button
            onClick={handleCopySnippets}
            className={btnBase}
          >
            {copySnippetsState === 'copied'
              ? 'Copied!'
              : copySnippetsState === 'error'
                ? 'Failed'
                : 'Copy <meta> tags'}
          </button>
        </div>
      </section>
    </div>
  );
}
