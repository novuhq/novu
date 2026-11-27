import type { JsonLogicRule } from '@/components/conditions-editor/lossless-rule';

export function UneditableRuleNotice({ rule }: { rule: JsonLogicRule | undefined }) {
  return (
    <>
      <p className="text-warning-base text-xs">
        This rule was written through the API and uses conditions the editor can't show. Edit it through the API.
      </p>
      <pre className="bg-bg-weak overflow-x-auto rounded-md p-3 font-mono text-xs">{JSON.stringify(rule, null, 2)}</pre>
    </>
  );
}
