import { useEffect, useState } from 'react';

import type { OgData } from '@/lib/types';

import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

import { FacebookCard } from './platform/FacebookCard';
import { FacebookMobileCard } from './platform/FacebookMobileCard';
import { IMessageCard } from './platform/IMessageCard';
import { LinkedInCard } from './platform/LinkedInCard';
import { WhatsAppCard } from './platform/WhatsAppCard';
import { XCard } from './platform/XCard';

const PLATFORMS = [
  { key: 'twitter', label: 'X', Card: XCard },
  { key: 'facebook', label: 'Facebook', Card: FacebookCard },
  { key: 'linkedin', label: 'LinkedIn', Card: LinkedInCard },
  { key: 'facebook-mobile', label: 'FB Mobile', Card: FacebookMobileCard },
  { key: 'imessage', label: 'iMessage', Card: IMessageCard },
  { key: 'whatsapp', label: 'WhatsApp', Card: WhatsAppCard },
] as const;

interface PreviewsTabProps {
  ogData: OgData;
}

export function PreviewsTab({ ogData }: PreviewsTabProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };
    api.on('select', onSelect);

    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  return (
    <div className="w-full">
      <Carousel
        setApi={setApi}
        opts={{ align: 'start', loop: false, dragFree: false }}
      >
        <CarouselContent className="-ml-0">
          {PLATFORMS.map(({ key, Card }) => (
            <CarouselItem
              key={key}
              className="basis-full pl-0"
            >
              <div className="p-3">
                <Card ogData={ogData} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 py-2">
        {PLATFORMS.map(({ key }, index) => (
          <button
            key={key}
            type="button"
            aria-label={`Go to ${PLATFORMS[index]!.label}`}
            className={cn(
              'rounded-full transition-all duration-200',
              index === current
                ? 'h-1.5 w-4 bg-foreground'
                : 'h-1.5 w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50',
            )}
            onClick={() => api?.scrollTo(index)}
          />
        ))}
      </div>

      {/* Platform label */}
      <p className="pb-2 text-center text-[10px] font-medium tracking-[0.15em] text-muted-foreground uppercase">
        {PLATFORMS[current]?.label}
      </p>
    </div>
  );
}
