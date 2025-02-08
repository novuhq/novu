import { RiAddFill } from 'react-icons/ri';
import { ActionWithRulesAndAddersProps } from 'react-querybuilder';

import { Button } from '@/components/primitives/button';

export const AddConditionAction = ({ label, title, rules, handleOnClick }: ActionWithRulesAndAddersProps) => {
  if (rules && rules.length >= 10) {
    return null;
  }

  return (
    <Button
      mode="outline"
      variant="secondary"
      size="2xs"
      className="bg-transparent"
      onClick={handleOnClick}
      leadingIcon={RiAddFill}
      title={title}
    >
      {label}
    </Button>
  );
};
