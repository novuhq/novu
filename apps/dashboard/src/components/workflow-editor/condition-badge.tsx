import { useMemo } from 'react';
import { RQBJsonLogic } from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
import { useNavigate } from 'react-router-dom';
import { Code2 } from '@/components/icons/code-2';
import { parseJsonLogicOptions } from '@/utils/conditions';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

interface ConditionBadgeProps {
  conditionsCount: number;
  stepSlug: string;
  conditionsData?: RQBJsonLogic;
  className?: string;
}

export const ConditionBadge = ({ conditionsCount, stepSlug, conditionsData, className }: ConditionBadgeProps) => {
  const navigate = useNavigate();

  const firstConditionField = useMemo(() => {
    if (!conditionsData) return 'condition';

    try {
      const query = parseJsonLogic(conditionsData, parseJsonLogicOptions);
      const firstRule = query.rules?.[0];

      if (firstRule && 'field' in firstRule) {
        return firstRule.field || 'condition';
      }
    } catch {
      // Fallback if parsing fails
    }

    return 'condition';
  }, [conditionsData]);

  const displayVariableName = useMemo(() => {
    if (!firstConditionField) return '';
    const variableParts = firstConditionField.split('.');

    return variableParts.length >= 3 ? `..${variableParts.slice(-2).join('.')}` : firstConditionField;
  }, [firstConditionField]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(buildRoute(ROUTES.EDIT_STEP_CONDITIONS, { stepSlug }));
  };

  const moreText = conditionsCount > 1 ? `+ ${conditionsCount - 1} more` : '';

  return (
    <button
      type="button"
      className={cn(
        'absolute left-3 right-3 top-full flex h-[26px] flex-col justify-center items-start rounded-b-lg border-l border-r border-b border-stroke-soft bg-linear-to-b from-[#F8F8F8] to-white px-2 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity duration-200',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1.5 text-foreground-600 font-code tracking-[-0.24px]">
        <span className="text-foreground-400 text-xs italic font-serif">if</span>
        <span className="bg-bg-weak border-stroke-soft font-code inline-flex items-center gap-1 rounded-md border px-1.5 py-px font-medium">
          <Code2 className="text-feature size-3.5 min-w-3.5" />
          <span className="text-label-xs text-[#6C6E73] max-w-[24ch] truncate " title={displayVariableName}>
            {displayVariableName}
          </span>
        </span>
        {moreText && (
          <span className="text-text-soft font-code text-center font-medium leading-4 text-2xs">{moreText}</span>
        )}
      </div>
    </button>
  );
};

// Content-only version for the new base-node structure
export const ConditionBadgeContent = ({
  conditionsCount,
  stepSlug,
  conditionsData,
}: Omit<ConditionBadgeProps, 'className'>) => {
  const navigate = useNavigate();

  const firstConditionField = useMemo(() => {
    if (!conditionsData) return 'condition';

    try {
      const query = parseJsonLogic(conditionsData, parseJsonLogicOptions);
      const firstRule = query.rules?.[0];

      if (firstRule && 'field' in firstRule) {
        return firstRule.field || 'condition';
      }
    } catch {
      // Fallback if parsing fails
    }

    return 'condition';
  }, [conditionsData]);

  const displayVariableName = useMemo(() => {
    if (!firstConditionField) return '';
    const variableParts = firstConditionField.split('.');

    return variableParts.length >= 3 ? `..${variableParts.slice(-2).join('.')}` : firstConditionField;
  }, [firstConditionField]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(buildRoute(ROUTES.EDIT_STEP_CONDITIONS, { stepSlug }));
  };

  const moreText = conditionsCount > 1 ? `+ ${conditionsCount - 1} more` : '';

  return (
    <button
      type="button"
      className="flex h-[26px] w-full flex-col justify-center items-start rounded-b-lg border-l border-r border-b border-stroke-soft bg-linear-to-b from-[#F8F8F8] to-white px-2 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity duration-200"
      onClick={handleClick}
    >
      <div className="flex items-center gap-1.5 text-foreground-600 font-code tracking-[-0.24px]">
        <span className="text-foreground-400 text-xs italic font-serif">if</span>
        <span className="bg-bg-weak border-stroke-soft font-code inline-flex items-center gap-1 rounded-md border px-1.5 py-px font-medium">
          <Code2 className="text-feature size-3.5 min-w-3.5" />
          <span className="leading-1 text-[#6C6E73] max-w-[24ch] truncate " title={displayVariableName}>
            {displayVariableName}
          </span>
        </span>
        {moreText && (
          <span className="text-text-soft font-code text-center font-medium leading-4 text-2xs">{moreText}</span>
        )}
      </div>
    </button>
  );
};
