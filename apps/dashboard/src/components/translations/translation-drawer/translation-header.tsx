import { RiTranslate2 } from 'react-icons/ri';

type TranslationHeaderProps = {
  resourceName: string;
};

export function TranslationHeader({ resourceName }: TranslationHeaderProps) {
  return (
    <header className="border-bg-soft flex h-12 w-full flex-row items-center gap-3 border-b px-3 py-4">
      <div className="flex flex-1 items-center gap-2 overflow-hidden text-sm font-medium">
        <RiTranslate2 className="h-4 w-4 text-neutral-600" />
        <span className="flex-1 truncate pr-10">{resourceName}</span>
      </div>
    </header>
  );
}
