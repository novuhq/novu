import { RiLayout2Line } from 'react-icons/ri';

import { CreateLayoutButton } from './create-layout-btn';

export const LayoutListBlank = () => {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
          <RiLayout2Line className="h-8 w-8 text-neutral-600" />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-foreground-950 text-lg font-semibold">No email layouts yet</h3>
          <p className="text-foreground-600 text-sm">
            Create your first email layout to define reusable templates for your email notifications.
          </p>
        </div>
        <CreateLayoutButton icon={RiLayout2Line} text="Create your first layout" />
      </div>
    </div>
  );
};
