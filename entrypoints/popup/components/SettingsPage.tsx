import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';

import type { OgPreviewSettings } from '@/lib/settings';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

interface SettingsPageProps {
  settings: OgPreviewSettings;
  onUpdate: <K extends keyof OgPreviewSettings>(
    key: K,
    value: OgPreviewSettings[K],
  ) => void;
  onBack: () => void;
}

export function SettingsPage({
  settings,
  onUpdate,
  onBack,
}: SettingsPageProps) {
  const [localHoverDelay, setLocalHoverDelay] = useState(settings.hoverDelay);

  return (
    <div className="flex w-[380px] flex-col">
      {/* Header */}
      <div className="flex h-10 items-center gap-2 border-b border-border px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="-ml-1 size-7"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            size={16}
            color="currentColor"
          />
        </Button>
        <span className="text-sm font-semibold tracking-wide">Settings</span>
      </div>

      {/* Settings list */}
      <div className="flex flex-col">
        {/* Hover Preview */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <Label
              htmlFor="hover-preview"
              className="cursor-pointer text-sm font-medium"
            >
              Hover Preview
            </Label>
            <span className="text-xs text-muted-foreground">
              Show link preview on hover
            </span>
          </div>
          <Switch
            id="hover-preview"
            checked={settings.hoverPreview}
            onCheckedChange={(v) => {
              onUpdate('hoverPreview', v);
            }}
          />
        </div>

        <Separator />

        {/* Default Tab */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <Label className="text-sm font-medium">Default Tab</Label>
            <span className="text-xs text-muted-foreground">
              Tab shown on expand
            </span>
          </div>
          <Select
            value={settings.defaultTab}
            onValueChange={(v) => {
              onUpdate('defaultTab', v as OgPreviewSettings['defaultTab']);
            }}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="previews">Previews</SelectItem>
              <SelectItem value="metadata">Metadata</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Hover Delay */}
        <div className="flex flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm font-medium">Hover Delay</Label>
              <span className="text-xs text-muted-foreground">
                Wait before showing preview
              </span>
            </div>
            <span className="min-w-[52px] text-right text-xs text-muted-foreground tabular-nums">
              {localHoverDelay} ms
            </span>
          </div>
          <Slider
            value={[localHoverDelay]}
            onValueChange={([v]) => {
              setLocalHoverDelay(v ?? 0);
            }}
            onValueCommit={([v]) => {
              onUpdate('hoverDelay', v ?? 0);
            }}
            min={0}
            max={2000}
            step={50}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Theme */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <Label className="text-sm font-medium">Theme</Label>
            <span className="text-xs text-muted-foreground">
              Appearance override
            </span>
          </div>
          <Select
            value={settings.theme}
            onValueChange={(v) => {
              onUpdate('theme', v as OgPreviewSettings['theme']);
            }}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
