import { faqAssets as assets, FAQ_HEADING, FAQ_ITEMS, type FaqItem } from '@/data/sapien-faq';

import { Artwork } from './artwork';
import { SectionFrame } from './section-frame';

export function Faq({ items = FAQ_ITEMS }: { items?: readonly FaqItem[] }) {
  return (
    <SectionFrame anchor="faq" className="px-4 pt-20 pb-8 md:px-8 md:pt-37">
      <div className="md:grid md:grid-cols-[minmax(12rem,1fr)_minmax(0,39.8125rem)] md:gap-x-6">
        <h2 className="text-3xl leading-[34px] tracking-[-0.04em] md:text-[40px] md:leading-[1.125]">
          {FAQ_HEADING.lead}
          <br />
          {FAQ_HEADING.rest}
        </h2>
        {/* Figma's list is 647px with the first item open: its bottom stroke overlaps the last row instead of adding a pixel. */}
        <div className="mt-8 overflow-hidden rounded-xl border border-sapien-border md:mt-0 md:-mb-px">
          {items.map((item) => (
            <FaqRow key={item.id} item={item} />
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}

function FaqRow({ item }: { item: FaqItem }) {
  return (
    <details
      open={item.defaultOpen}
      className="group border-t border-sapien-border [interpolate-size:allow-keywords] details-content:h-0 details-content:overflow-clip details-content:transition-[height,content-visibility] details-content:transition-discrete details-content:duration-200 details-content:ease-out first:border-t-0 open:details-content:h-auto motion-reduce:details-content:transition-none"
    >
      {/* Figma lays lines out on whole pixels (24.66 → 25, 18.75 → 19: its five-line answer is a 95px box), hence px line heights. */}
      <summary className="relative flex min-h-[71px] cursor-pointer list-none items-start justify-between gap-3 py-[23px] pr-4 pl-5 text-base leading-[22px] tracking-tight text-sapien-foreground/70 transition-[color] duration-150 group-open:text-accent group-not-open:hover:text-sapien-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none md:gap-4 md:pr-[23px] md:pl-[23px] md:text-lg md:leading-[25px] [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="absolute top-[23px] left-0 h-6 w-1 rounded-[1px] bg-sapien-foreground" />
        <span className="pt-px md:pt-0">{item.question}</span>
        {/* Open: clip away the vertical arms; what is left is exactly Figma's split "– –" minus (874:9997). */}
        <Artwork
          asset={assets.imgFrame}
          className="block size-6 shrink-0 transition-[clip-path] duration-200 [clip-path:inset(0)] group-open:[clip-path:inset(11px_0)] motion-reduce:transition-none"
        />
      </summary>
      <p className="border-t border-sapien-border pt-[23px] pr-4 pb-6 pl-5 text-[15px] leading-[19px] tracking-tight text-sapien-foreground md:pr-[47px] md:pb-6 md:pl-[23px]">
        {item.answer}
      </p>
    </details>
  );
}
