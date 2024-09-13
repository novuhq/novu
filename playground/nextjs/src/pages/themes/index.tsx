import { useState } from 'react';
import { Inbox, Notifications } from '@novu/react';
import { light as notionLight } from '@novu/themes/notion';
import { light as defaultLight } from '@novu/themes/default';
import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';
import styles from './themes.module.css';

const themes: any = {
  default: defaultLight,
  notion: notionLight,
  linear: notionLight,
};

export default function NovuTheme() {
  const [selectedTheme, setSelectedTheme] = useState('default');

  return (
    <>
      <div className={styles.container}>
        <Title title="Theme Selector" />
        <select value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)} className={styles.select}>
          <option value="default">Default</option>
          <option value="notion">Notion</option>
          <option value="linear">Linear</option>
        </select>
        <div className="w-96 h-96 overflow-y-auto">
          <Inbox {...novuConfig} appearance={{ baseTheme: themes[selectedTheme] }}>
            <Notifications />
          </Inbox>
        </div>
      </div>
    </>
  );
}
