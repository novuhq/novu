import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { Kbd } from '@/components/primitives/kbd';

type HelpFooterLinkProps = {
  icon: IconType;
  children: ReactNode;
  hasIndicator?: boolean;
  onClick: () => void;
};

export function HelpFooterLink({ icon: Icon, children, hasIndicator, onClick }: HelpFooterLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/footer-link flex shrink-0 items-center gap-1.5 rounded-6 px-1.5 py-[5px] outline-none transition-colors hover:bg-bg-white focus-visible:bg-bg-white focus-visible:ring-1 focus-visible:ring-stroke-soft"
    >
      <Icon
        aria-hidden
        className="size-3.5 shrink-0 text-text-soft transition-colors group-hover/footer-link:text-text-sub"
      />
      <span className="text-label-xs text-text-sub transition-colors group-hover/footer-link:text-text-strong">
        {children}
      </span>
      {hasIndicator ? (
        <>
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary-base" />
          <span className="sr-only">New updates</span>
        </>
      ) : null}
    </button>
  );
}

type HelpKeyHintProps = {
  keys: string;
  children: ReactNode;
};

export function HelpKeyHint({ keys, children }: HelpKeyHintProps) {
  return (
    <span className="flex shrink-0 items-center gap-[5px]">
      <Kbd variant="raised">{keys}</Kbd>
      <span className="text-paragraph-xs text-text-soft">{children}</span>
    </span>
  );
}
