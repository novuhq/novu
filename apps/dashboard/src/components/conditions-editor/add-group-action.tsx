import { ActionWithRulesAndAddersProps } from 'react-querybuilder';

import { DEFAULT_MAX_CONDITIONS_PER_GROUP } from '@/components/conditions-editor/types';
import { StackedPlusLine } from '@/components/icons/stacked-plus-line';
import { Button } from '@/components/primitives/button';

export const AddGroupAction = ({
  label,
  title,
  level,
  rules,
  handleOnClick,
  context,
  disabled,
}: ActionWithRulesAndAddersProps) => {
  const maxConditionsPerGroup = context?.maxConditionsPerGroup ?? DEFAULT_MAX_CONDITIONS_PER_GROUP;

  if (level === 1 || (rules && rules.length >= maxConditionsPerGroup)) {
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
      leadingIcon={StackedPlusLine}
      title={title}
    >
      {label}
    </Button>
  );
};
