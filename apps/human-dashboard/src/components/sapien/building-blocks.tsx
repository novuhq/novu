import {
  Bell,
  Braces,
  FastForward,
  Hourglass,
  Link,
  type LucideIcon,
  MessagesSquare,
  MousePointerClick,
  RotateCcw,
  Users,
} from 'lucide-react';

import { Tabs, TabsContent } from '@/components/sapien/tabs';
import type { DesignAsset } from '@/data/sapien-assets';
import {
  BUILDING_BLOCK_EXAMPLES,
  BUILDING_BLOCK_EXTRAS,
  BUILDING_BLOCK_FEATURES,
  BUILDING_BLOCKS_DEFAULT_TAB,
  BUILDING_BLOCKS_HEADING,
  BUILDING_BLOCKS_TABS_LABEL,
  type BuildingBlockExtra,
  type ExtraIcon,
  STRUCTURED_REPLIES,
} from '@/data/sapien-building-blocks';
import { cn } from '@/lib/utils';

import { Artwork } from './artwork';
import { BuildingBlockVisualScene } from './building-block-visual';
import { BuildingBlocksPanel } from './building-blocks-panel';
import { PillTab, PillTabsList } from './pill-tabs';
import { DisplayAccent, SectionEyebrow } from './section-eyebrow';
import { SectionFrame } from './section-frame';

const card =
  'group/card flex min-w-0 flex-col bg-sapien-background transition-colors duration-200 hover:bg-[#0a0908] motion-reduce:transition-none';

const EXTRA_ICONS = {
  link: Link,
  users: Users,
  button: MousePointerClick,
  deadline: Hourglass,
  async: FastForward,
  wait: MessagesSquare,
  wake: Bell,
  resolve: RotateCcw,
  json: Braces,
} as const satisfies Record<ExtraIcon, LucideIcon>;

/**
 * Source order is one column at a time, so a phone stacks a column together. From `md` the rows
 * read across, and the grid lines stay level.
 */
const EXTRA_ORDER = [
  ['md:order-1', 'md:order-4', 'md:order-7'],
  ['md:order-2', 'md:order-5', 'md:order-8'],
  ['md:order-3', 'md:order-6', 'md:order-9'],
] as const;

/** A block's label (its icon and B-0n), title and one line on what it does. */
function BlockText({
  index,
  icon,
  title,
  description,
  className,
}: {
  index: number;
  icon: DesignAsset;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <p className="flex items-center gap-2.5">
        <Artwork asset={icon} className="size-4.5 shrink-0" />
        <span
          aria-hidden="true"
          className="font-sapien-pixel text-[10px] leading-none tracking-[0.08em] text-sapien-foreground/30"
        >
          B-{String(index + 1).padStart(2, '0')}
        </span>
      </p>
      <h3 className="text-xl leading-[1.15] tracking-[-0.03em] text-sapien-foreground">{title.replace(/\.$/, '')}</h3>
      <p className="max-w-100 text-[15px] leading-[1.45] tracking-tight text-pretty text-sapien-foreground/50">
        {description}
      </p>
    </div>
  );
}

/** One row of the smaller blocks. The icon matches the orange marks on the feature cards above. */
function ExtraRow({ extra, className }: { extra: BuildingBlockExtra; className?: string }) {
  const Icon = EXTRA_ICONS[extra.icon];

  return (
    <li className={cn(card, className)}>
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <span className="flex min-w-0 items-center gap-2.5">
          <Icon aria-hidden="true" className="size-4.5 shrink-0 text-accent" strokeWidth={2} />
          <span className="text-sm leading-5 tracking-[-0.02em] text-pretty text-sapien-foreground/80">
            {extra.title}
          </span>
        </span>
        <code className="shrink-0 font-sapien-mono text-[11px] leading-4 tracking-tight text-sapien-foreground/30 transition-colors duration-200 group-hover/card:text-sapien-foreground/70 motion-reduce:transition-none">
          {extra.flag}
        </code>
      </div>
    </li>
  );
}

/**
 * The feature cards, the smaller blocks, and structured replies share one grid. A 1px line splits every cell.
 */
export function BuildingBlocks() {
  const [firstLine, secondLine] = BUILDING_BLOCKS_HEADING.lead;

  return (
    <SectionFrame anchor="building-blocks" className="px-4 pt-24 pb-10 md:px-8 md:pt-32">
      <div className="sapien-reveal flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <SectionEyebrow index={BUILDING_BLOCKS_HEADING.index}>{BUILDING_BLOCKS_HEADING.label}</SectionEyebrow>
          <h2 className="mt-5 text-[min(34px,8vw)] leading-[1.05] font-normal tracking-[-0.04em] md:text-[44px]">
            {`${firstLine} ${secondLine}`}{' '}
            <DisplayAccent className="block text-[min(40px,9.5vw)] leading-[1.1] md:text-[56px]">
              {BUILDING_BLOCKS_HEADING.accent}
            </DisplayAccent>
          </h2>
        </div>
        <p className="max-w-88 text-[17px] leading-[1.45] tracking-tight text-pretty text-sapien-foreground/50 lg:pb-2">
          {BUILDING_BLOCKS_HEADING.description}
        </p>
      </div>

      <div className="sapien-reveal mt-12 flex flex-col gap-px overflow-hidden rounded-2xl border border-sapien-border bg-sapien-border md:mt-16">
        <ul className="grid grid-cols-1 gap-px md:grid-cols-3">
          {BUILDING_BLOCK_FEATURES.map((feature, index) => (
            <li key={feature.title} className={card}>
              <BuildingBlockVisualScene visual={feature.visual} />
              <BlockText
                index={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                className="px-6 pt-5 pb-7"
              />
            </li>
          ))}
        </ul>

        <ul className="grid grid-cols-1 gap-px md:grid-cols-3">
          {BUILDING_BLOCK_EXTRAS.map((column, columnIndex) =>
            column.map((extra, rowIndex) => (
              <ExtraRow key={extra.title} extra={extra} className={EXTRA_ORDER[columnIndex][rowIndex]} />
            ))
          )}
        </ul>

        <div className={card}>
          <Tabs defaultValue={BUILDING_BLOCKS_DEFAULT_TAB} className="flex flex-col">
            <div className="flex flex-col gap-5 px-6 pt-6 pb-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
              <BlockText
                index={BUILDING_BLOCK_FEATURES.length}
                icon={STRUCTURED_REPLIES.icon}
                title={STRUCTURED_REPLIES.title}
                description={STRUCTURED_REPLIES.description}
              />
              <PillTabsList
                aria-label={BUILDING_BLOCKS_TABS_LABEL}
                className="-mx-6 shrink-0 sm:mx-0 sm:w-md lg:mb-0.5"
              >
                {BUILDING_BLOCK_EXAMPLES.map((example) => (
                  <PillTab
                    key={example.id}
                    value={example.id}
                    className="h-8 text-[13px] min-[360px]:px-2.5 sm:h-8 sm:px-4 sm:text-[13px]"
                  >
                    {example.label}
                  </PillTab>
                ))}
              </PillTabsList>
            </div>
            {BUILDING_BLOCK_EXAMPLES.map((example) => (
              <TabsContent
                key={example.id}
                value={example.id}
                className="px-2 pb-2 data-[state=active]:animate-[sapien-in_450ms_cubic-bezier(0.22,1,0.36,1)_backwards] motion-reduce:animate-none"
              >
                <BuildingBlocksPanel example={example} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </SectionFrame>
  );
}
