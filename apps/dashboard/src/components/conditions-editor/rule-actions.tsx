import { RiMore2Fill } from 'react-icons/ri';
import { ActionWithRulesProps, getParentPath, isRuleGroup } from 'react-querybuilder';

import { Delete } from '@/components/icons/delete';
import { SquareTwoStack } from '@/components/icons/square-two-stack';
import { CompactButton } from '@/components/primitives/button-compact';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useConditionsEditorContext } from './conditions-editor-context';

export const RuleActions = ({ path, ruleOrGroup, context, disabled }: ActionWithRulesProps) => {
  const { removeRuleOrGroup, cloneRuleOrGroup, canCloneRuleOrGroup, maxConditionsPerGroup } =
    useConditionsEditorContext();
  const parentPath = getParentPath(path);
  const isGroup = isRuleGroup(ruleOrGroup);
  const isDuplicateDisabled = !canCloneRuleOrGroup(ruleOrGroup, parentPath);

  if (disabled) {
    return null;
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <CompactButton
          icon={RiMore2Fill}
          variant="ghost"
          size="lg"
          className="ml-auto size-7 [&_svg]:size-4"
          data-actions
        ></CompactButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" withPortal={false}>
        <DropdownMenuGroup className="*:cursor-pointer">
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                onClick={() => {
                  if (cloneRuleOrGroup(ruleOrGroup, parentPath)) {
                    context?.saveForm();
                  }
                }}
                className="text-foreground-600 text-label-xs h-7 data-disabled:pointer-events-auto"
                disabled={isDuplicateDisabled}
              >
                <SquareTwoStack className="[&&]:size-3.5" /> Duplicate {isGroup ? `group` : `condition`}
              </DropdownMenuItem>
            </TooltipTrigger>
            {isDuplicateDisabled && (
              <TooltipContent className="max-w-52">
                Duplicating would exceed the maximum of {maxConditionsPerGroup} conditions or groups per group
              </TooltipContent>
            )}
          </Tooltip>

          <DropdownMenuItem
            onClick={() => {
              removeRuleOrGroup(path);
              context?.saveForm();
            }}
            className="text-error-base text-label-xs h-7"
          >
            <Delete className="[&&]:size-3.5" />
            Delete {isGroup ? `group` : `condition`}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
