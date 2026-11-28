/** Shadows and menu styles shared by the integration store's cards, tiles and menus. */

/** A card or tile at rest: a hairline ring and a soft drop. */
export const CARD_SHADOW =
  'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_0_rgba(0,0,0,0.04)]';

/** The same card lifted a little on hover. */
export const CARD_HOVER_SHADOW =
  'hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_8px_0_rgba(0,0,0,0.1)]';

/** Menus, flyouts and other floating surfaces. */
export const POPOVER_SHADOW =
  'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_8px_0_rgba(0,0,0,0.08),0_8px_16px_0_rgba(0,0,0,0.08)]';

/** A card's or the drawer's "…" menu; callers set its width. */
export const MENU_CLASS = `bg-bg-weak rounded-xl border-0 p-1 ${POPOVER_SHADOW}`;

/** An item in those menus. */
export const MENU_ITEM_CLASS =
  'text-text-sub focus:text-text-strong h-7 gap-2 rounded px-2 py-0 text-[13px] leading-[1.1] focus:bg-[#f4f4f5] [&>svg]:size-[15px]';
