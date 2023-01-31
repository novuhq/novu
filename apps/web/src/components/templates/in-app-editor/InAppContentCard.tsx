import { useFormContext } from 'react-hook-form';
import { Tabs } from '../../../design-system';
import { useEnvController } from '../../../store/useEnvController';
import { InAppEditorBlock } from './InAppEditorBlock';

export const EDITOR = 'Editor';
export const PREVIEW = 'Preview';

export function InAppContentCard({
  index,
  activeTab,
  setActiveTab,
}: {
  index: number;
  activeTab: string;
  setActiveTab: (activeTab: string) => void;
}) {
  const { readonly } = useEnvController();
  const { control } = useFormContext(); // retrieve all hook methods

  const onTabChange = (value: string | null) => {
    if (value === null) {
      return;
    }
    setActiveTab(value);
  };

  const menuTabs = [
    {
      value: EDITOR,
      content: <InAppEditorBlock control={control as any} index={index} readonly={readonly} />,
    },
    {
      value: PREVIEW,
      content: (
        <div
          style={{
            maxWidth: '450px',
            margin: '0 auto 30px auto',
          }}
        >
          <InAppEditorBlock control={control as any} index={index} readonly={true} preview={true} />
        </div>
      ),
    },
  ];

  return (
    <div data-test-id="editor-type-selector">
      <Tabs value={activeTab} onTabChange={onTabChange} menuTabs={menuTabs} />
    </div>
  );
}
