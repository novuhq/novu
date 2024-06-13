import { Text, Tooltip } from '@novu/design-system';
import React from 'react';

export enum PlanFootnoteEnum {
  COMING_SOON = 'COMING_SOON',
}

export type PlanFootnote = {
  id: string;
  icon: string;
  singleText: string;
  pluralText: string;
};

export const PLAN_FOOTNOTES: Record<PlanFootnoteEnum, PlanFootnote> = {
  [PlanFootnoteEnum.COMING_SOON]: {
    id: 'coming-soon',
    icon: '*',
    singleText: 'This feature is coming soon.',
    pluralText: 'These features are coming soon.',
  },
};

export const PlanFootnoteIcon = ({ id }: { id: PlanFootnoteEnum }) => {
  const footnote = PLAN_FOOTNOTES[id];

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    event.preventDefault();
    const element = document.getElementById(footnote.id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Tooltip label={footnote.singleText}>
      <a href={`#${footnote.id}`} onClick={handleClick} style={{ textDecoration: 'none' }}>
        <Text gradient>
          <code>{footnote.icon}</code>
        </Text>
      </a>
    </Tooltip>
  );
};

export const PlanFootnotes = () => {
  return (
    <>
      {Object.values(PLAN_FOOTNOTES).map((footnote) => (
        <div
          id={footnote.id}
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Text gradient>
            <code>{footnote.icon}</code>
          </Text>
          <Text style={{ paddingLeft: 4 }}>{footnote.pluralText}</Text>
        </div>
      ))}
    </>
  );
};
