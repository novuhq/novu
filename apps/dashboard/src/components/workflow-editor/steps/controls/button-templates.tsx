import { Registry, RJSFSchema } from '@rjsf/utils';
import { RiAddLine, RiSubtractFill } from 'react-icons/ri';
import { CompactButton } from '../../../primitives/button-compact';

export const AddButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <CompactButton
      icon={RiAddLine}
      variant="ghost"
      className="size-4 rounded-sm p-0.5"
      type="button"
      {...props}
      title="Add item"
    ></CompactButton>
  );
};

export const RemoveButton = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { registry?: Registry<any, RJSFSchema, any> }
) => {
  return (
    <CompactButton
      icon={RiSubtractFill}
      variant="ghost"
      className="size-4 rounded-sm p-0.5"
      type="button"
      {...props}
      title="Remove item"
    ></CompactButton>
  );
};
