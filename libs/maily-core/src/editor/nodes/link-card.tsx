import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { Input } from '../components/input';
import { Popover, PopoverContent, PopoverTrigger } from '../components/popover';
import { Textarea } from '../components/textarea';
import { cn } from '../utils/classname';

export function LinkCardComponent(props: NodeViewProps) {
  const { title, description, link, linkTitle, image, badgeText, subTitle } = props.node.attrs;
  const { getPos, editor } = props;

  return (
    <NodeViewWrapper
      className={`react-component ${props.selected && 'ProseMirror-selectednode'}`}
      draggable={editor.isEditable}
      data-drag-handle={editor.isEditable}
    >
      <Popover open={props.selected}>
        <PopoverTrigger asChild>
          <div
            tabIndex={-1}
            onClick={(e) => {
              e.preventDefault();
              const pos = getPos();
              editor.commands.setNodeSelection(pos);
            }}
          >
            <div className="mly-no-prose mly-flex mly-flex-col mly-rounded-lg mly-border mly-border-gray-300">
              {image && (
                <div className="mly-relative mly-mb-1.5 mly-w-full mly-shrink-0">
                  <img
                    src={image}
                    alt="link-card"
                    className="mly-no-prose !mly-mb-0 mly-h-full mly-w-full mly-rounded-t-lg"
                    draggable={editor.isEditable}
                  />
                </div>
              )}
              <div className="mly-flex mly-items-stretch mly-p-3">
                <div className={cn('mly-flex mly-flex-col')}>
                  <div className="!mly-mb-1.5 mly-flex mly-items-center mly-gap-1.5">
                    <h2 className="!mly-mb-0 !mly-text-lg mly-font-semibold">{title}</h2>
                    {badgeText && (
                      <span className="!mly-font-base text-xs mly-rounded-md mly-bg-yellow-200 mly-px-2 mly-py-1 mly-font-semibold mly-leading-none">
                        {badgeText}
                      </span>
                    )}{' '}
                    {subTitle && !badgeText && (
                      <span className="!mly-font-base text-xs mly-font-regular mly-rounded-md mly-leading-none mly-text-gray-400">
                        {subTitle}
                      </span>
                    )}
                  </div>
                  <p className="!mly-my-0 !mly-text-base mly-text-gray-500">
                    {description}{' '}
                    {linkTitle ? (
                      <a href={link} className="mly-font-semibold">
                        {linkTitle}
                      </a>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="mly-flex mly-w-96 mly-flex-col mly-gap-2"
          sideOffset={10}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <label className="mly-w-full mly-space-y-1">
            <span className="mly-text-xs mly-font-normal mly-text-slate-400">Image</span>
            <Input
              placeholder="Add Image"
              type="url"
              value={image}
              onChange={(e) => {
                props.updateAttributes({
                  image: e.target.value,
                });
              }}
            />
          </label>

          <label className="mly-w-full mly-space-y-1">
            <span className="mly-text-xs mly-font-normal mly-text-slate-400">Title</span>
            <Input
              placeholder="Add title"
              value={title}
              onChange={(e) => {
                props.updateAttributes({
                  title: e.target.value,
                });
              }}
            />
          </label>

          <label className="mly-w-full mly-space-y-1">
            <span className="mly-text-xs mly-font-normal mly-text-slate-400">Description</span>
            <Textarea
              placeholder="Add description here"
              value={description}
              onChange={(e) => {
                props.updateAttributes({
                  description: e.target.value,
                });
              }}
            />
          </label>

          <div className="mly-grid mly-grid-cols-2 mly-gap-2">
            <label className="mly-w-full mly-space-y-1">
              <span className="mly-text-xs mly-font-normal mly-text-slate-400">Link Title</span>
              <Input
                placeholder="Add link title here"
                value={linkTitle}
                onChange={(e) => {
                  props.updateAttributes({
                    linkTitle: e.target.value,
                  });
                }}
              />
            </label>

            <label className="mly-w-full mly-space-y-1">
              <span className="mly-text-xs mly-font-normal mly-text-slate-400">Link</span>
              <Input
                placeholder="Add link here"
                value={link}
                onChange={(e) => {
                  props.updateAttributes({
                    link: e.target.value,
                  });
                }}
              />
            </label>
          </div>

          <div className="mly-grid mly-grid-cols-2 mly-gap-2">
            <label className="mly-w-full mly-space-y-1">
              <span className="mly-text-xs mly-font-normal mly-text-slate-400">Badge Text</span>
              <Input
                placeholder="Add badge text here"
                value={badgeText}
                onChange={(e) => {
                  props.updateAttributes({
                    badgeText: e.target.value,
                  });
                }}
              />
            </label>

            <label className="mly-w-full mly-space-y-1">
              <span className="mly-text-xs mly-font-normal mly-text-slate-400">Sub Title</span>
              <Input
                placeholder="Add sub title here"
                value={subTitle}
                onChange={(e) => {
                  props.updateAttributes({
                    subTitle: e.target.value,
                  });
                }}
              />
            </label>
          </div>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}
