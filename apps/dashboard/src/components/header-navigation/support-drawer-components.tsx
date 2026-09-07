import { SuggestionItem } from './support-drawer-constants';

type SuggestionCardProps = {
  item: SuggestionItem;
  onOpenUrl: (url: string) => void;
  onTrack: (title: string) => void;
};

export function SuggestionCard({ item, onOpenUrl, onTrack }: SuggestionCardProps) {
  const Icon = item.icon;

  return (
    <button
      onClick={() => {
        onTrack(item.title);
        onOpenUrl(item.url);
      }}
      className="bg-background hover:bg-neutral-50 border-stroke-soft group flex w-full items-center gap-2 rounded-xl border p-2 transition-colors text-left"
    >
      <div className="border-stroke-soft flex shrink-0 items-center justify-center overflow-hidden rounded-lg border p-px">
        <div className="bg-neutral-alpha-50 group-hover:bg-white flex size-[54px] items-center justify-center rounded-[7px] transition-colors">
          <Icon className="text-foreground-300 size-4" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-foreground-950 text-sm font-medium leading-5 tracking-[-0.084px]">{item.title}</span>
        <span className="text-foreground-400 text-xs leading-4">{item.description}</span>
      </div>
    </button>
  );
}

type FooterLinkProps = {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
};

export function FooterLink({ icon: Icon, children, onClick }: FooterLinkProps) {
  return (
    <button
      onClick={onClick}
      className="hover:bg-neutral-alpha-50 flex h-7 w-full items-center gap-1.5 rounded-md px-2 transition-colors"
    >
      <Icon className="text-foreground-600 size-4 shrink-0" />
      <span className="text-foreground-950 text-sm font-medium leading-5 tracking-[-0.28px]">{children}</span>
    </button>
  );
}
