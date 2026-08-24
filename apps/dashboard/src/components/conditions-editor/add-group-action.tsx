import { ActionWithRulesAndAddersProps } from 'react-querybuilder';

import { StackedPlusLine } from '@/components/icons/stacked-plus-line';
import { Button } from '@/components/primitives/button';
import { useConditionsEditorContext } from './conditions-editor-context';

export const AddGroupAction = ({
  label,
  title,
  level,
  path,
  handleOnClick,
  context,
  disabled,
}: ActionWithRulesAndAddersProps) => {
  const { canAddToGroup } = useConditionsEditorContext();

  if (disabled || level === 1 || !canAddToGroup(path)) {
    return null;
  }

  return (
    <Button
      mode="outline"
      variant="secondary"
      size="2xs"
      className="bg-transparent"
      onClick={(e) => {
        if (!canAddToGroup(path)) {
          return;
        }

        handleOnClick(e);
        context?.saveForm();
      }}
      leadingIcon={StackedPlusLine}
      title={title}
    >
      {label}
    </Button>
  );
};
