import { AGENT_ID_CARD, heroAssets } from '@/data/sapien-hero';

import { Artwork } from './artwork';
import { CHANNEL_NAMES, ChannelLogo } from './brand-logo';
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
        <div className="mt-[5px] flex w-[217px] flex-col gap-3">
          <dl className="flex flex-col gap-2">
            {card.fields.map((field) => (
              <div key={field.label} className="flex flex-col">
                <dt className="text-[13px] leading-[1.2] tracking-[-0.01em] text-sapien-foreground/50">
                  {field.label}
                </dt>
                <dd className="text-base leading-none tracking-tight text-sapien-foreground">{field.value}</dd>
              </div>
            ))}
          </dl>
          <dl className="flex flex-col gap-2 border-t border-sapien-foreground/5 pt-2.5">
            {card.channels.map((row) => (
              <div key={row.channel} className="flex items-center gap-2">
                <dt className="flex">
                  <ChannelLogo channel={row.channel} size={16} />
                  <span className="sr-only">{CHANNEL_NAMES[row.channel]}</span>
                </dt>
                <dd className="truncate font-sapien-mono text-[12px] leading-none tracking-tight text-sapien-foreground/80">
                  {row.address}
                </dd>
              </div>
            ))}
          </dl>
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
