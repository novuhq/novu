import { UiComponentEnum } from '@novu/shared';

import { EmailEditorSelect } from '@/components/email-editor-select';
import { LayoutEmailBody } from './layout-email-body';

const EmailEditorSelectInternal = () => {
  return (
    <EmailEditorSelect
      isLoading={false}
      saveForm={() => {
        // TODO: preview the layout and save it's html in the form
        return Promise.resolve();
      }}
    />
  );
};

export const getLayoutComponentByType = ({ component }: { component?: UiComponentEnum }) => {
  switch (component) {
    case UiComponentEnum.EMAIL_EDITOR_SELECT: {
      return <EmailEditorSelectInternal />;
    }

    case UiComponentEnum.EMAIL_BODY:
      return <LayoutEmailBody />;

    default: {
      return null;
    }
  }
};
