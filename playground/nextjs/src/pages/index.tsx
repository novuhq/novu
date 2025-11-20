import { Inbox } from '@novu/nextjs';
import { dark } from '@novu/nextjs/themes';
import { useState } from 'react';
import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';

export default function Home() {
  const [isDark, setIsDark] = useState(false);

  const toggleDarkTheme = () => {
    setIsDark((prev) => !prev);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <>
      <Title title="Default Inbox" />
      <div className="h-[600px] w-96 overflow-y-auto flex flex-col gap-4 items-start">
        <button onClick={toggleDarkTheme}>Toggle Dark Theme</button>
        <Inbox
          {...novuConfig}
          localization={{
            'notifications.newNotifications': ({ notificationCount }) => `${notificationCount} new notifications`,
            dynamic: {
              '6697c185607852e9104daf33': 'My workflow in other language', // key is workflow id
            },
          }}
          appearance={{
            baseTheme: isDark ? dark : undefined,
          }}
          tabs={[
            {
              label: 'Notifications',
            },
            {
              label: 'More tabs1',
            },
            {
              label: 'More tabs2',
            },
            {
              label: 'More tabs3',
            },
            {
              label: 'More tabs4',
            },
            {
              label: 'More tabs5',
            },
          ]}
          placement="left-start"
          placementOffset={25}
        />
      </div>
    </>
  );
}
