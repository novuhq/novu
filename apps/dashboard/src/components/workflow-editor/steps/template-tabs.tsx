import React, { useEffect } from 'react';
import { RiCloseLine, RiEdit2Line, RiPencilRuler2Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';

import { Notification5Fill } from '@/components/icons';
import { Separator } from '@/components/primitives/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { CompactButton } from '../../primitives/button-compact';

interface TemplateTabsProps {
  editorContent: React.ReactNode;
  previewContent?: React.ReactNode;
  tabsValue: string;
  onTabChange: (tab: string) => void;
  previewStep?: () => void;
}

export const TemplateTabs = ({
  editorContent,
  previewContent,
  tabsValue,
  onTabChange,
  previewStep,
}: TemplateTabsProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    // We reload the preview when the tab changes to get the latest values
    if (tabsValue === 'preview') {
      previewStep?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabsValue]);

  return (
    <Tabs defaultValue="editor" value={tabsValue} onValueChange={onTabChange} className="flex h-full flex-1 flex-col">
      <header className="flex flex-row items-center gap-3 px-3 py-1.5">
        <div className="mr-auto flex items-center gap-2.5 text-sm font-medium">
          <RiEdit2Line className="size-4" />
          <span>Configure Template</span>
        </div>
        <TabsList className="w-min">
          <TabsTrigger value="editor" className="gap-1.5">
            <RiPencilRuler2Line className="size-5 p-0.5" />
            <span>Editor</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5" disabled={!previewContent}>
            <Notification5Fill className="size-5 p-0.5" />
            <span>Preview</span>
          </TabsTrigger>
        </TabsList>

        <CompactButton
          icon={RiCloseLine}
          variant="ghost"
          className="size-6"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate('../', { relative: 'path' });
          }}
        >
          <span className="sr-only">Close</span>
        </CompactButton>
      </header>
      <Separator />
      <TabsContent value="editor" className="h-full w-full overflow-y-auto">
        {editorContent}
      </TabsContent>
      <TabsContent value="preview" className="h-full w-full overflow-y-auto">
        {previewContent}
      </TabsContent>
      <Separator />
    </Tabs>
  );
};
