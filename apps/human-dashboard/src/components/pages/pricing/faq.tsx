import { FaqRow } from '@/components/sapien/faq';
import { DisplayAccent } from '@/components/sapien/section-eyebrow';
import { SectionFrame } from '@/components/sapien/section-frame';
import { PRICING_FAQ } from '@/data/pricing';

export function PricingFaq() {
  return (
    <SectionFrame
      anchor="faq"
      className="grid gap-8 px-4 py-20 md:px-8 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)] lg:gap-12"
    >
      <h2 className="text-[34px] leading-[1.125] tracking-[-0.04em] md:text-[40px]">
        Questions,
        <DisplayAccent className="mt-2 block text-[46px] leading-none md:text-[56px]">answered.</DisplayAccent>
      </h2>
      <div className="overflow-hidden rounded-xl border border-sapien-border">
        {PRICING_FAQ.map((item) => (
          <FaqRow key={item.id} item={item} variant="landing" />
        ))}
      </div>
    </SectionFrame>
  );
}
