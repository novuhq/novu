/** biome-ignore-all lint/correctness/useUniqueElementIds: expected */
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { RiCodeBlock, RiSidebarFoldLine, RiSidebarUnfoldLine } from 'react-icons/ri';
import { PanelSize, usePanelRef } from 'react-resizable-panels';
import { BroomSparkle } from '@/components/icons/broom-sparkle';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';

const COLLAPSED_SIZE_PX = 44;
const MIN_SIZE_PX = 280;
const DEFAULT_SIZE_PX = 420;

type SidebarTab = 'copilot' | 'preview';

type CopilotSidebarProps = {
  children: ReactNode;
  copilotContent: ReactNode;
  previewContent?: ReactNode;
  testWorkflowButton?: ReactNode;
  isGenerating?: boolean;
  autoSaveId?: string;
  hideCollapseButton?: boolean;
  maxSize?: string;
};

function RailIconButton({
  onClick,
  tooltip,
  isActive,
  children,
}: {
  onClick: () => void;
  tooltip: string;
  isActive?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'mt-px text-text-soft hover:bg-bg-weak flex size-11 items-center justify-center transition-colors border-b border-neutral-200',
            isActive && 'bg-bg-white text-text-strong'
          )}
          aria-label={tooltip}
          aria-pressed={isActive}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function CollapseButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="secondary"
      size="2xs"
      mode="ghost"
      className="p-1.5 text-icon-soft"
      leadingIcon={RiSidebarFoldLine}
      onClick={onClick}
      aria-label="Collapse sidebar"
    />
  );
}

function CollapsedRail({
  hasPreview,
  activeTab,
  isGenerating,
  onExpand,
}: {
  hasPreview: boolean;
  activeTab: SidebarTab;
  isGenerating?: boolean;
  onExpand: (tab?: SidebarTab) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center">
      <div className="flex flex-col items-center">
        <RailIconButton onClick={() => onExpand('copilot')} tooltip="Novu Copilot" isActive={activeTab === 'copilot'}>
          <div className="flex size-5  items-center justify-center">
            <BroomSparkle className="size-3" isAnimating={isGenerating} />
          </div>
        </RailIconButton>
        {hasPreview && (
          <RailIconButton
            onClick={() => onExpand('preview')}
            tooltip="Preview sandbox"
            isActive={activeTab === 'preview'}
          >
            <RiCodeBlock className="size-3" />
          </RailIconButton>
        )}
      </div>
      <div className="mt-auto p-2">
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onExpand()}
              aria-label="Expand sidebar"
              className="text-text-soft hover:bg-bg-weak flex size-7 items-center justify-center rounded transition-colors"
            >
              <RiSidebarUnfoldLine className="size-4 text-icon-soft" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand sidebar</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function TabbedExpandedPanel({
  activeTab,
  setActiveTab,
  copilotContent,
  previewContent,
  testWorkflowButton,
  onCollapse,
  hideCollapseButton,
}: {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  copilotContent: ReactNode;
  previewContent: ReactNode;
  testWorkflowButton?: ReactNode;
  onCollapse: () => void;
  hideCollapseButton?: boolean;
}) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SidebarTab)} className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 pr-3">
        <TabsList variant="regular" className="border-b-0 border-t-0 px-3 py-2 overflow-x-auto nv-no-scrollbar">
          <TabsTrigger value="copilot" size="xs" variant="regular">
            <span className="flex items-center gap-1">
              <BroomSparkle className="size-3" />
              <span className="text-label-sm">Novu Copilot</span>
              <Badge variant="lighter" color="gray" className="ml-1">
                BETA
              </Badge>
            </span>
          </TabsTrigger>
          <TabsTrigger value="preview" size="xs" variant="regular">
            <span className="flex items-center gap-1">
              <RiCodeBlock className="size-3" />
              <span className="text-label-sm">Preview sandbox</span>
            </span>
          </TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-1">
          {testWorkflowButton}
          {!hideCollapseButton && <CollapseButton onClick={onCollapse} />}
        </div>
      </div>
      <TabsContent value="copilot" className={`flex min-h-0 flex-1 flex-col data-[state="inactive"]:hidden`} forceMount>
        {copilotContent}
      </TabsContent>
      <TabsContent value="preview" className={`flex min-h-0 flex-1 flex-col data-[state="inactive"]:hidden`} forceMount>
        {previewContent}
      </TabsContent>
    </Tabs>
  );
}

function CopilotOnlyExpandedPanel({
  copilotContent,
  isGenerating,
  onCollapse,
  hideCollapseButton,
}: {
  copilotContent: ReactNode;
  isGenerating?: boolean;
  onCollapse: () => void;
  hideCollapseButton?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2">
        <div className="flex items-center gap-0.5 rounded px-0.5 py-1">
          <div className="flex size-5 items-center justify-center">
            <BroomSparkle className="size-3" isAnimating={isGenerating} />
          </div>
          <span
            className="text-label-sm font-medium"
            style={{
              background: 'linear-gradient(90deg, #939292 0%, #646464 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Novu Copilot
          </span>
          <Badge variant="lighter" color="gray" className="ml-1">
            BETA
          </Badge>
        </div>
        {!hideCollapseButton && <CollapseButton onClick={onCollapse} />}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{copilotContent}</div>
    </div>
  );
}

export function CopilotSidebar({
  children,
  copilotContent,
  previewContent,
  testWorkflowButton,
  isGenerating,
  autoSaveId,
  hideCollapseButton,
  maxSize = '60%',
}: CopilotSidebarProps) {
  const hasPreview = !!previewContent;
  const panelRef = usePanelRef();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>(hasPreview ? 'preview' : 'copilot');
  const groupRef = useRef<HTMLDivElement>(null);

  const handleExpand = (tab?: SidebarTab) => {
    if (tab) setActiveTab(tab);
    panelRef.current?.resize(DEFAULT_SIZE_PX);
    groupRef.current?.classList.add(
      '*:data-panel:transition-[flex-grow]',
      '*:data-panel:duration-300',
      '*:data-panel:ease-in-out'
    );
  };

  const handleCollapse = () => {
    panelRef.current?.collapse();
    groupRef.current?.classList.add(
      '*:data-panel:transition-[flex-grow]',
      '*:data-panel:duration-300',
      '*:data-panel:ease-in-out'
    );
  };

  const handleResize = useCallback(
    (panelSize: PanelSize) => {
      const isCollapsed = panelRef.current?.isCollapsed() ?? false;
      if (panelSize.inPixels >= 0 && panelSize.inPixels <= MIN_SIZE_PX) {
        groupRef.current?.classList.add(
          '*:data-panel:transition-[flex-grow]',
          '*:data-panel:duration-300',
          '*:data-panel:ease-in-out'
        );
      } else {
        groupRef.current?.classList.remove(
          '*:data-panel:transition-[flex-grow]',
          '*:data-panel:duration-300',
          '*:data-panel:ease-in-out'
        );
      }
      setIsCollapsed(isCollapsed);
    },
    [panelRef]
  );

  return (
    <ResizablePanelGroup
      ref={groupRef}
      orientation="horizontal"
      autoSaveId={autoSaveId}
      className={cn('h-full', '*:data-panel:transition-[flex-grow] *:data-panel:duration-300 *:data-panel:ease-in-out')}
    >
      <ResizablePanel
        id="copilot-sidebar-panel"
        panelRef={panelRef}
        collapsible
        collapsedSize={COLLAPSED_SIZE_PX}
        minSize={MIN_SIZE_PX}
        defaultSize={DEFAULT_SIZE_PX}
        maxSize={maxSize}
        groupResizeBehavior="preserve-pixel-size"
        onResize={handleResize}
        className={cn('h-full overflow-hidden!', isCollapsed && 'min-w-11')}
      >
        {isCollapsed ? (
          <CollapsedRail
            hasPreview={hasPreview}
            activeTab={activeTab}
            isGenerating={isGenerating}
            onExpand={handleExpand}
          />
        ) : hasPreview ? (
          <TabbedExpandedPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            copilotContent={copilotContent}
            previewContent={previewContent}
            testWorkflowButton={testWorkflowButton}
            onCollapse={handleCollapse}
            hideCollapseButton={hideCollapseButton}
          />
        ) : (
          <CopilotOnlyExpandedPanel
            copilotContent={copilotContent}
            isGenerating={isGenerating}
            onCollapse={handleCollapse}
            hideCollapseButton={hideCollapseButton}
          />
        )}
      </ResizablePanel>
      <ResizableHandle
        withHandle
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
      <ResizablePanel id="copilot-content" minSize="20%" className="h-full">
        {children}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
