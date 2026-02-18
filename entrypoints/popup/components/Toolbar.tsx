import type React from 'react';

import {
  Cursor01Icon,
  Moon02Icon,
  Settings01Icon,
  Sun01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { OgPreviewSettings } from '@/lib/settings';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';

interface ToolbarProps {
  settings: OgPreviewSettings;
  activeTab: string;
  onToggleHoverPreview: () => void;
  onChangeTheme: (theme: OgPreviewSettings['theme']) => void;
  onOpenSettings: () => void;
  onCollapse: () => void;
}

export function Toolbar({
  settings,
  activeTab,
  onToggleHoverPreview,
  onChangeTheme,
  onOpenSettings,
  onCollapse,
}: ToolbarProps) {
  // Collapse on re-click: preventDefault stops Radix's onMouseDown handler
  // from re-activating the tab, so we can set activeTab to '' instead.
  // For inactive tabs, Radix handles activation normally.
  function handleTriggerMouseDown(value: string) {
    return (e: React.MouseEvent) => {
      if (activeTab === value) {
        e.preventDefault();
        onCollapse();
      }
    };
  }

  const triggerClassName =
    'h-full rounded-none border-b-2 border-transparent px-3 text-[10px] tracking-widest uppercase data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none';

  return (
    <div className="flex h-9 items-center justify-between border-b border-border px-1">
      {/* Left: Tab triggers */}
      <TabsList className="h-full rounded-none bg-transparent p-0">
        <TabsTrigger
          value="previews"
          className={triggerClassName}
          onMouseDown={handleTriggerMouseDown('previews')}
        >
          Previews
        </TabsTrigger>
        <TabsTrigger
          value="metadata"
          className={triggerClassName}
          onMouseDown={handleTriggerMouseDown('metadata')}
        >
          Metadata
        </TabsTrigger>
      </TabsList>

      {/* Right: Quick-action icons */}
      <div className="flex items-center">
        {/* Hover preview toggle */}
        <Toggle
          size="sm"
          pressed={settings.hoverPreview}
          onPressedChange={onToggleHoverPreview}
          aria-label="Toggle hover preview"
        >
          <HugeiconsIcon
            icon={Cursor01Icon}
            size={14}
            className="transition-[fill] group-data-[state=on]/toggle:fill-foreground"
          />
        </Toggle>

        {/* Theme picker dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Change theme"
            >
              <HugeiconsIcon
                icon={settings.theme === 'dark' ? Moon02Icon : Sun01Icon}
                size={14}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-28"
          >
            <DropdownMenuRadioGroup
              value={settings.theme}
              onValueChange={(v) => {
                onChangeTheme(v as OgPreviewSettings['theme']);
              }}
            >
              <DropdownMenuRadioItem value="system">
                System
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings navigation */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onOpenSettings}
          aria-label="Open settings"
        >
          <HugeiconsIcon
            icon={Settings01Icon}
            size={14}
          />
        </Button>
      </div>
    </div>
  );
}
