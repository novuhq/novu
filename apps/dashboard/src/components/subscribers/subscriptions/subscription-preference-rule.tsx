import { tags as t } from '@lezer/highlight';
import { langs, loadLanguage } from '@uiw/codemirror-extensions-langs';
import { createTheme } from '@uiw/codemirror-themes';
import CodeMirror from '@uiw/react-codemirror';
import { motion } from 'motion/react';
import { useState } from 'react';
import { RiContractUpDownLine, RiExpandUpDownLine } from 'react-icons/ri';
import { TopicSubscriptionPreference } from '@/api/topics';
import { Card, CardContent, CardHeader } from '@/components/primitives/card';
import { Checkbox } from '@/components/primitives/checkbox';
import { cn } from '@/utils/ui';

loadLanguage('json');

const lightTheme = createTheme({
  theme: 'light',
  settings: {
    background: '#ffffff',
    foreground: '#24292e',
    caret: '#24292e',
    selection: '#b3d4fc',
    lineHighlight: '#f5f5f5',
    gutterBackground: '#ffffff',
    gutterForeground: '#6e7681',
    gutterBorder: 'transparent',
  },
  styles: [
    { tag: t.keyword, color: '#d73a49' },
    { tag: t.operator, color: '#d73a49' },
    { tag: t.brace, color: '#24292e' },
    { tag: t.propertyName, color: '#005cc5' },
    { tag: t.definition(t.propertyName), color: '#005cc5' },
    { tag: t.string, color: '#032f62' },
    { tag: t.comment, color: '#6a737d' },
    { tag: t.variableName, color: '#e36209' },
    { tag: [t.function(t.variableName), t.definition(t.variableName)], color: '#6f42c1' },
    { tag: t.typeName, color: '#005cc5' },
    { tag: t.className, color: '#005cc5' },
    { tag: t.number, color: '#005cc5' },
    { tag: t.bool, color: '#d73a49' },
  ],
});

export const SubscriptionPreferenceRule = ({ preference }: { preference: TopicSubscriptionPreference }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (preference.condition) {
    return (
      <Card className="border rounded-lg border-neutral-100 bg-neutral-50 p-1 shadow-none">
        <CardHeader
          className={cn('flex w-full flex-row items-center justify-between gap-2 p-1 hover:cursor-pointer', {
            'pb-2': isExpanded,
          })}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-label-xs truncate">{preference.workflow.name}</span>
          <div className="mt-0! flex items-center gap-1.5">
            {isExpanded ? (
              <RiContractUpDownLine className="text-foreground-400 h-3 w-3" />
            ) : (
              <RiExpandUpDownLine className="text-foreground-400 h-3 w-3" />
            )}
          </div>
        </CardHeader>
        <motion.div
          initial={{
            height: 0,
            opacity: 0,
          }}
          animate={{
            height: isExpanded ? 400 : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={{
            height: { duration: 0.2 },
            opacity: { duration: 0.2 },
          }}
          className="overflow-auto"
        >
          <CardContent className="space-y-2 rounded-lg bg-white p-2">
            <CodeMirror
              value={JSON.stringify(preference.condition, null, 2)}
              theme={lightTheme}
              extensions={[langs.json()]}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: false,
                highlightActiveLine: false,
                foldGutter: false,
              }}
              editable={false}
              className={cn(
                'overflow-auto text-xs [&_.cm-editor]:py-0 [&_.cm-scroller]:font-mono [&_.cm-editor]:bg-transparent',
                '[&_.cm-gutters]:border-0 [&_.cm-lineNumbers]:min-w-[3ch]'
              )}
            />
          </CardContent>
        </motion.div>
      </Card>
    );
  }

  return (
    <div className="flex justify-between gap-2 items-center">
      <span className="text-label-xs truncate">{preference.workflow.name}</span>
      <Checkbox checked={preference.enabled} disabled />
    </div>
  );
};
