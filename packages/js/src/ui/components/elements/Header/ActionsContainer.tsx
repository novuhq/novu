import { useStyle } from '../../../helpers';
import { Archived, ArchiveRead, ReadAll, Settings } from '../../../icons';
import { OptionsDropdown } from '../OptionsDropdown';
import type { Option } from '../OptionsDropdown';

const options: Array<Option> = [
  { label: 'Mark all as read', leftIcon: <ReadAll /> },
  { label: 'Archive all', leftIcon: <Archived /> },
  { label: 'Archive read', leftIcon: <ArchiveRead /> },
];

type ActionsContainerProps = {
  showPreferences: () => void;
};

export const ActionsContainer = (props: ActionsContainerProps) => {
  const style = useStyle();

  return (
    <div class={style('optionsContainer', 'nt-flex nt-gap-2')}>
      <OptionsDropdown placement="bottom-end" options={options} />
      <button
        class={style(
          'settings__button',
          `nt-h-6 nt-w-6 nt-flex nt-justify-center nt-items-center nt-rounded-md
          nt-relative hover:nt-bg-foreground-alpha-50 nt-text-foreground-alpha-600`
        )}
        onClick={props.showPreferences}
      >
        <Settings />
      </button>
    </div>
  );
};
