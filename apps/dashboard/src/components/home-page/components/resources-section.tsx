import { RiBookletFill, RiBookmark2Fill, RiListCheck3 } from 'react-icons/ri';
import { ProgressSection } from '../../welcome/progress-section';
import { ResourcesList } from '../../welcome/resources-list';
import { HELPFUL_RESOURCES, LEARN_RESOURCES } from '../constants/home-page';

export function ResourcesSection() {
  return (
    <div className="flex flex-row gap-6 w-full">
      <div className="flex flex-col gap-6 flex-1 min-w-0">
        <ResourcesList
          title="Helpful resources"
          icon={<RiBookmark2Fill className="h-4 w-4" />}
          resources={HELPFUL_RESOURCES}
        />

        <ResourcesList title="Learn" icon={<RiBookletFill className="h-4 w-4" />} resources={LEARN_RESOURCES} />
      </div>

      <div className="flex flex-col gap-3 w-[400px] min-w-[400px]">
        <div className="flex items-center gap-1 text-label-xs text-text-sub">
          <RiListCheck3 className="size-3.5 text-icon-soft" /> Things to do
        </div>
        <ProgressSection isNewHomePageEnabled={true} />
      </div>
    </div>
  );
}
