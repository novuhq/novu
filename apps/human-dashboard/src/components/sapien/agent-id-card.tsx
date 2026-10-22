import { AGENT_ID_CARD, heroAssets } from '@/data/sapien-hero';

import { Artwork } from './artwork';
import { CardFace, CardHeader, CardMrz, CardRule, type CardSurface } from './hero-card';

/** The 365×386 Agent ID card shown in the hero stack and, scaled, in the closing section. */
export function AgentIdCard({ surface = 'glass', className }: { surface?: CardSurface; className?: string }) {
  const card = AGENT_ID_CARD;
  return (
    <CardFace surface={surface} className={className ?? 'h-[386px]'}>
      <CardHeader title={card.title} badge={card.number} outlined />
      <CardRule className="mt-[15px] ml-5 w-[325px]" />
      <div className="mt-3 flex gap-4 pl-5">
        <Artwork asset={heroAssets.agentIdAvatar} className="h-[175px] w-24 rounded-2xl" />
        <div className="mt-[5px] flex w-[217px] flex-col gap-5">
          <dl className="flex flex-col gap-3">
            {card.fields.map((field) => (
              <div key={field.label} className="flex flex-col">
                <dt className="text-[13px] leading-[1.2] tracking-[-0.01em] text-sapien-foreground/50">
                  {field.label}
                </dt>
                <dd className="text-base leading-none tracking-tight text-sapien-foreground">{field.value}</dd>
              </div>
            ))}
          </dl>
          <ul className="flex gap-1">
            {card.channels.map((channel) => (
              <li
                key={channel}
                className="rounded-lg bg-accent/12 px-2.5 py-1.5 text-sm leading-none tracking-tight text-accent"
              >
                {channel}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <CardMrz
        lines={card.mrz}
        ruleWidth="w-[313.462px]"
        className="mt-[18px] ml-5 w-[326px]"
        textClassName="tracking-[0.2em]"
      />
    </CardFace>
  );
}
