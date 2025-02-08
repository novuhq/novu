import { ActionWithRulesAndAddersProps } from 'react-querybuilder';

import { StackedPlusLine } from '@/components/icons/stacked-plus-line';
import { Button } from '@/components/primitives/button';

export const AddGroupAction = ({ label, title, level, rules, handleOnClick }: ActionWithRulesAndAddersProps) => {
  if (level === 1 || (rules && rules.length >= 10)) {
    return null;
  }

  return (
    <Button
      mode="outline"
      variant="secondary"
      size="2xs"
      className="bg-transparent"
      onClick={handleOnClick}
      leadingIcon={StackedPlusLine}
      title={title}
    >
      {label}
    </Button>
  );
};
