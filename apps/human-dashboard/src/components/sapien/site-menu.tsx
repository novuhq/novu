'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { HEADER_NAVIGATION } from '@/data/sapien';
import { cn } from '@/lib/utils';

import { SiteNavigation } from './site-navigation';

/**
 * Small-screen header navigation: a disclosure button (Figma 895:1895) that
 * shows the header links in a panel under the header. The open panel isn't
 * designed in Figma; it reuses the header's tokens and link styles.
 */
export function SiteMenu({ label, className }: { label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={root} className={className}>
      <button
        ref={button}
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'grid size-8.5 cursor-pointer place-items-center rounded border border-border text-white transition-colors duration-150 hover:bg-border motion-reduce:transition-none',
          open && 'bg-border'
        )}
      >
        <MenuIcon open={open} />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-px top-[calc(100%+1px)] z-[15] border-b border-border bg-black px-2.5 py-3 transition-[opacity,translate] duration-150 motion-reduce:transition-none starting:-translate-y-1 starting:opacity-0"
      >
        <SiteNavigation
          items={HEADER_NAVIGATION}
          label={label}
          onNavigate={() => setOpen(false)}
          className="flex-col flex-nowrap items-stretch [&>a]:h-10"
        />
      </div>
    </div>
  );
}

/** Figma's "menu-7" icon (20×20, three bars), and a matching close icon when open. */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      {open ? (
        <>
          <rect x="2" y="9.375" width="16" height="1.25" rx="0.3125" transform="rotate(45 10 10)" />
          <rect x="2" y="9.375" width="16" height="1.25" rx="0.3125" transform="rotate(-45 10 10)" />
        </>
      ) : (
        <>
          <rect x="0.625" y="3.75" width="18.75" height="1.25" rx="0.3125" />
          <rect x="0.625" y="9.375" width="11.875" height="1.25" rx="0.3125" />
          <rect x="0.625" y="15" width="18.75" height="1.25" rx="0.3125" />
        </>
      )}
    </svg>
  );
}
