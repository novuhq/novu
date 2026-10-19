import { RiAddFill } from 'react-icons/ri';
import { ActionWithRulesAndAddersProps } from 'react-querybuilder';

import { Button } from '@/components/primitives/button';
import { useConditionsEditorContext } from './conditions-editor-context';

export const AddConditionAction = ({
  label,
  title,
  path,
  handleOnClick,
  context,
  disabled,
}: ActionWithRulesAndAddersProps) => {
  const { canAddToGroup } = useConditionsEditorContext();

  if (disabled || !canAddToGroup(path)) {
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
      leadingIcon={RiAddFill}
      title={title}
    >
      {label}
    </Button>
  );
};
