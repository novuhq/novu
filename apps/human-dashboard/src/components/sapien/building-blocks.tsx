import { Tabs, TabsContent } from '@/components/sapien/tabs';
import {
  BUILDING_BLOCK_EXAMPLES,
  BUILDING_BLOCK_FEATURES,
  BUILDING_BLOCKS_DEFAULT_TAB,
  BUILDING_BLOCKS_DESCRIPTION,
  BUILDING_BLOCKS_HEADING,
  BUILDING_BLOCKS_TABS_LABEL,
} from '@/data/sapien-building-blocks';
import { cn } from '@/lib/utils';

import { Artwork } from './artwork';
import { BuildingBlocksPanel } from './building-blocks-panel';
import { PillTab, PillTabsList } from './pill-tabs';
import { SectionFrame } from './section-frame';

export function BuildingBlocks() {
  const [firstLine, secondLine] = BUILDING_BLOCKS_HEADING.lead;
  return (
    <SectionFrame anchor="building-blocks" className="px-4 pt-20 pb-8 md:px-8 md:pt-37">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="font-normal">
          <span className="block text-3xl leading-[1.125] tracking-[-0.04em] text-sapien-foreground/70 md:text-4xl">
            {firstLine}
            <br />
            {secondLine}
          </span>
          <em className="mt-[13px] block font-sapien-display text-[40px] leading-none tracking-[-0.02em] text-accent [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] min-[380px]:text-5xl md:h-[41px] md:text-[56px]">
            {BUILDING_BLOCKS_HEADING.accent}
          </em>
        </h2>
        <p className="max-w-88 text-[15px] leading-[1.375] tracking-tight text-sapien-foreground/50 lg:mr-12 lg:-mb-1.25 lg:w-88">
          {BUILDING_BLOCKS_DESCRIPTION.map((line, index) => (
            <span key={line}>
              {index > 0 ? (
                <>
                  {' '}
                  <br className="hidden lg:block" />
                </>
              ) : null}
              {line}
            </span>
          ))}
        </p>
      </div>

      <Tabs defaultValue={BUILDING_BLOCKS_DEFAULT_TAB} className="mt-10 md:mt-14">
        {/* Below sm the strip runs from rail to rail. */}
        <PillTabsList aria-label={BUILDING_BLOCKS_TABS_LABEL} className="-mx-4 sm:mx-0">
          {BUILDING_BLOCK_EXAMPLES.map((example) => (
            <PillTab key={example.id} value={example.id}>
              {example.label}
            </PillTab>
          ))}
        </PillTabsList>
        {BUILDING_BLOCK_EXAMPLES.map((example) => (
          <TabsContent key={example.id} value={example.id} className="mt-5">
            <BuildingBlocksPanel example={example} />
          </TabsContent>
        ))}
      </Tabs>

      <ul className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {BUILDING_BLOCK_FEATURES.map((feature, index) => (
          <li
            key={feature.title}
            className={cn(
              'flex min-h-[178.5px] flex-col justify-between gap-6 bg-sapien-background p-[19px]',
              index === BUILDING_BLOCK_FEATURES.length - 1 && 'sm:col-span-2'
            )}
          >
            <Artwork asset={feature.icon} className="size-6" />
            <p className="max-w-[259px] text-lg leading-[23px] tracking-tight text-sapien-foreground/70">
              <span className="text-sapien-foreground">{feature.title}</span> {feature.description}
            </p>
          </li>
        ))}
      </ul>
    </SectionFrame>
  );
}
