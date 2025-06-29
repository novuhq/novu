import { LinkButton } from '@/components/primitives/button-link';
import { Switch } from '@/components/primitives/switch';
import { RiBookMarkedLine, RiTranslate2 } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { EmptyTranslationsIllustration } from './empty-translations-illustration';

export const TranslationListBlank = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <EmptyTranslationsIllustration />

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-text-sub text-label-md block font-medium">
          One language is good. Speaking your users' language? Better.
        </span>
        <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
          Enable translations globally or in a workflow and start speaking your users' language(s).
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3">
          <RiTranslate2 className="h-5 w-5 text-neutral-600" />
          <span className="text-sm font-medium text-neutral-700">Enable translations</span>
          <Switch defaultChecked={false} onCheckedChange={() => {}} />
        </div>

        <Link to="https://docs.novu.co/platform/translations" target="_blank">
          <LinkButton variant="gray" trailingIcon={RiBookMarkedLine}>
            View docs
          </LinkButton>
        </Link>
      </div>
    </div>
  );
};
