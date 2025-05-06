import { ArrayFieldTemplateItemType } from '@rjsf/utils';
import { cn } from '@/utils/ui';
import { RemoveButton } from './button-templates';

export const ArrayFieldItemTemplate = (props: ArrayFieldTemplateItemType) => {
  const isChildObjectType = props.schema.type === 'object';

  return (
    <div className="relative flex items-center gap-2 *:flex-1">
      {props.children}
      <div
        className={cn(
          'bg-background absolute right-0 top-0 z-10 mt-2 flex w-5 -translate-y-1/2 items-center justify-end',
          { 'right-4 justify-start': isChildObjectType }
        )}
      >
        {props.hasRemove && (
          <RemoveButton
            disabled={props.disabled || props.readonly}
            onClick={(e) => props.onDropIndexClick(props.index)(e)}
            registry={props.registry}
          />
        )}
      </div>
    </div>
  );
};
