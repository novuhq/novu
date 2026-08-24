import { RiAddFill } from 'react-icons/ri';
import { ActionWithRulesAndAddersProps } from 'react-querybuilder';

import { DEFAULT_MAX_CONDITIONS_PER_GROUP } from '@/components/conditions-editor/types';
import { Button } from '@/components/primitives/button';

export const AddConditionAction = ({
  label,
  title,
  rules,
  handleOnClick,
  context,
  disabled,
}: ActionWithRulesAndAddersProps) => {
  const maxConditionsPerGroup = context?.maxConditionsPerGroup ?? DEFAULT_MAX_CONDITIONS_PER_GROUP;

  if (rules && rules.length >= maxConditionsPerGroup) {
    return null;
  }

  if (disabled) {
    return null;
  }

  return (
    <Button
      mode="outline"
      variant="secondary"
      size="2xs"
      className="bg-transparent"
      onClick={(e) => {
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
