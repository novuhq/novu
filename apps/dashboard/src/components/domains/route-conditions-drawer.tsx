import type { DomainRouteMatch } from '@novu/shared';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  RiCheckLine,
  RiCloseLine,
  RiFilterLine,
  RiInformation2Line,
  RiPriceTag3Line,
  RiSendPlaneLine,
} from 'react-icons/ri';
import { formatQuery, generateID, type RuleGroupType } from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
import type { DomainRouteResponse } from '@/api/domains';
import { ConditionsEditor } from '@/components/conditions-editor/conditions-editor';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Form } from '@/components/primitives/form/form';
import { Hint, HintIcon } from '@/components/primitives/hint';
import { Separator } from '@/components/primitives/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import { TagInput } from '@/components/primitives/tag-input';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { parseJsonLogicOptions } from '@/utils/conditions';
import { cn } from '@/utils/ui';
import {
  isAllowedRouteMatchVariable,
  ROUTE_MATCH_ENHANCED_VARIABLES,
  ROUTE_MATCH_FIELDS,
  ROUTE_MATCH_VARIABLES,
} from './route-match-fields';
import {
  findMatchingRoutePreset,
  getDefaultPresetValues,
  type PresetInputValues,
  ROUTE_MATCH_CATEGORIES,
  ROUTE_MATCH_PRESETS,
  type RouteMatchPreset,
} from './route-match-presets';
import { RouteValueEditor } from './route-value-editor';

type RouteConditionsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainName: string;
  route: DomainRouteResponse | null;
  onSave: (match: DomainRouteMatch | null) => Promise<void>;
  onSendTest: (route: DomainRouteResponse) => void;
  isSaving: boolean;
};

type DrawerTab = 'presets' | 'advanced';
type ConditionsFormState = { query: RuleGroupType };

const TAB_OPTIONS: Array<{ id: DrawerTab; label: string }> = [
  { id: 'presets', label: 'Quick presets' },
  { id: 'advanced', label: 'Advanced' },
];

function createEmptyQuery(): RuleGroupType {
  return { id: generateID(), combinator: 'and', rules: [] };
}

function parseMatchToQuery(match?: DomainRouteMatch | null): RuleGroupType {
  if (!match) return createEmptyQuery();

  try {
    return parseJsonLogic(match as never, {
      generateIDs: true,
      ...parseJsonLogicOptions,
    });
  } catch {
    return createEmptyQuery();
  }
}

function buildMatchFromQuery(query: RuleGroupType): DomainRouteMatch | null {
  if (query.rules.length === 0) return null;

  return formatQuery(query, { format: 'jsonlogic' }) as DomainRouteMatch;
}

function getInitialPresetState(match?: DomainRouteMatch | null): {
  presetId: string;
  values: PresetInputValues;
  tab: DrawerTab;
} {
  const matchedPreset = findMatchingRoutePreset(match);
  if (matchedPreset) {
    return {
      presetId: matchedPreset.preset.id,
      values: matchedPreset.values,
      tab: 'presets',
    };
  }

  const firstPreset = ROUTE_MATCH_PRESETS[0];

  return {
    presetId: firstPreset.id,
    values: getDefaultPresetValues(firstPreset),
    tab: match ? 'advanced' : 'presets',
  };
}

function hasRequiredPresetInputs(preset: RouteMatchPreset, values: PresetInputValues): boolean {
  return preset.inputs.every((input) => (values[input.id] ?? []).length > 0);
}

function PresetIcon({
  icon: Icon,
  category,
}: {
  icon: RouteMatchPreset['icon'];
  category: RouteMatchPreset['category'];
}) {
  const tone = {
    allow: 'bg-success/10 text-success',
    block: 'bg-destructive/10 text-destructive',
    quality: 'bg-information/10 text-information',
  }[category];

  return (
    <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', tone)}>
      <Icon className="size-3.5" />
    </div>
  );
}

function PresetCard({
  preset,
  selected,
  values,
  onSelect,
  onValuesChange,
}: {
  preset: RouteMatchPreset;
  selected: boolean;
  values: PresetInputValues;
  onSelect: () => void;
  onValuesChange: (values: PresetInputValues) => void;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-bg-white-0 transition-colors',
        selected ? 'border-stroke-strong shadow-xs' : 'border-stroke-soft hover:border-stroke-sub'
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex w-full items-start gap-2.5 rounded-t-lg px-3 py-2.5 text-left outline-hidden focus-visible:ring-2 focus-visible:ring-stroke-strong focus-visible:ring-offset-1"
      >
        <PresetIcon icon={preset.icon} category={preset.category} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-text-strong text-label-sm font-medium">{preset.label}</span>
            {selected ? (
              <span className="bg-success/10 text-success inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-medium">
                <RiCheckLine className="size-3" />
                Selected
              </span>
            ) : null}
          </div>
          <span className="text-text-soft mt-0.5 block text-label-xs">{preset.description}</span>
        </div>
      </button>
      {selected && preset.inputs.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-3 px-3 py-2.5">
            {preset.inputs.map((input) => (
              <div key={input.id} className="space-y-1.5">
                <label
                  htmlFor={`${preset.id}-${input.id}`}
                  className="text-foreground-500 text-2xs font-medium uppercase tracking-wide"
                >
                  {input.label}
                </label>
                <TagInput
                  id={`${preset.id}-${input.id}`}
                  value={values[input.id] ?? []}
                  suggestions={input.defaultValue ?? []}
                  placeholder={input.placeholder}
                  size="xs"
                  onChange={(next) => onValuesChange({ ...values, [input.id]: next })}
                />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function DrawerHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-stroke-soft bg-bg-white-0 px-4 py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="bg-feature/10 text-feature flex size-7 shrink-0 items-center justify-center rounded-md">
          <RiFilterLine className="size-3.5" />
        </div>
        <div className="min-w-0">
          <SheetTitle className="text-text-strong text-label-md font-medium">{title}</SheetTitle>
          <SheetDescription className="text-text-soft mt-0.5 truncate text-label-xs">{subtitle}</SheetDescription>
        </div>
      </div>
      <CompactButton icon={RiCloseLine} variant="ghost" size="md" onClick={onClose}>
        <span className="sr-only">Close</span>
      </CompactButton>
    </header>
  );
}

function TabSwitcher({ value, onValueChange }: { value: DrawerTab; onValueChange: (tab: DrawerTab) => void }) {
  return (
    <div className="bg-bg-white-0 inline-flex items-center gap-1 rounded-md border border-stroke-soft p-0.5">
      {TAB_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onValueChange(option.id)}
          aria-pressed={value === option.id}
          className={cn(
            'rounded px-3 py-1 text-label-xs font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-stroke-strong focus-visible:ring-offset-1',
            value === option.id ? 'bg-bg-weak text-text-strong' : 'text-text-soft hover:text-text-sub'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function RouteConditionsDrawer({
  open,
  onOpenChange,
  domainName,
  route,
  onSave,
  onSendTest,
  isSaving,
}: RouteConditionsDrawerProps) {
  const initialPresetState = useMemo(() => getInitialPresetState(route?.match), [route?.match]);
  const [tab, setTab] = useState<DrawerTab>(initialPresetState.tab);
  const [selectedPresetId, setSelectedPresetId] = useState(initialPresetState.presetId);
  const [presetValues, setPresetValues] = useState<PresetInputValues>(initialPresetState.values);
  const [query, setQuery] = useState<RuleGroupType>(() => parseMatchToQuery(route?.match));
  const routeIdentity = route?._id;
  const form = useForm<ConditionsFormState>({ defaultValues: { query } });
  const { reset, setValue } = form;

  useEffect(() => {
    if (!routeIdentity) return;

    const nextPresetState = getInitialPresetState(route?.match);
    setTab(nextPresetState.tab);
    setSelectedPresetId(nextPresetState.presetId);
    setPresetValues(nextPresetState.values);
    const nextQuery = parseMatchToQuery(route?.match);
    setQuery(nextQuery);
    reset({ query: nextQuery });
  }, [routeIdentity, route?.match, reset]);

  const selectedPreset = ROUTE_MATCH_PRESETS.find((preset) => preset.id === selectedPresetId) ?? ROUTE_MATCH_PRESETS[0];
  const canSavePreset = hasRequiredPresetInputs(selectedPreset, presetValues);
  const hasExistingMatch = Boolean(route?.match);

  const handlePresetSelect = (preset: RouteMatchPreset) => {
    setSelectedPresetId(preset.id);
    setPresetValues(getDefaultPresetValues(preset));
  };

  const handleTabChange = (next: DrawerTab) => {
    if (next === 'advanced') {
      const match = selectedPreset.build(presetValues);
      const nextQuery = parseMatchToQuery(match);
      setQuery(nextQuery);
      reset({ query: nextQuery });
      setTab('advanced');

      return;
    }

    const match = buildMatchFromQuery(query);
    const matchedPreset = findMatchingRoutePreset(match);
    if (matchedPreset) {
      setSelectedPresetId(matchedPreset.preset.id);
      setPresetValues(matchedPreset.values);
    }
    setTab('presets');
  };

  const handleSave = async () => {
    if (!route) return;

    const match = tab === 'presets' ? selectedPreset.build(presetValues) : buildMatchFromQuery(query);
    await onSave(match);
  };

  const handleQueryChange = (nextQuery: RuleGroupType) => {
    setQuery(nextQuery);
    setValue('query', nextQuery);
  };

  const handleClear = async () => {
    if (!route) return;

    await onSave(null);
  };

  const groupedPresets = ROUTE_MATCH_CATEGORIES.map((category) => ({
    ...category,
    presets: ROUTE_MATCH_PRESETS.filter((preset) => preset.category === category.id),
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-bg-weak flex flex-col p-0 sm:max-w-[560px]">
        <VisuallyHidden>
          <SheetTitle>Route conditions</SheetTitle>
          <SheetDescription>Configure conditions for this domain route.</SheetDescription>
        </VisuallyHidden>
        {route ? (
          <DrawerHeader
            title="Conditions"
            subtitle={`${route.address}@${domainName}`}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
        <SheetMain className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <TabSwitcher value={tab} onValueChange={handleTabChange} />
            {route ? (
              <Button
                type="button"
                variant="secondary"
                mode="ghost"
                size="2xs"
                onClick={() => onSendTest(route)}
                leadingIcon={RiSendPlaneLine}
              >
                Send test
              </Button>
            ) : null}
          </div>

          {tab === 'presets' ? (
            <div className="flex flex-col gap-4">
              <Hint className="bg-bg-white-0 rounded-md border border-stroke-soft px-2.5 py-1.5">
                <HintIcon as={RiInformation2Line} />
                <span>
                  Pick one preset. Inbound mail is delivered only when its rule matches; otherwise the wildcard route or
                  no route is used.
                </span>
              </Hint>
              {groupedPresets.map((category) => (
                <section key={category.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <RiPriceTag3Line className="text-text-soft size-3.5" />
                    <h3 className="text-text-soft text-2xs font-medium uppercase tracking-wide">{category.label}</h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    {category.presets.map((preset) => (
                      <PresetCard
                        key={preset.id}
                        preset={preset}
                        selected={preset.id === selectedPresetId}
                        values={presetValues}
                        onSelect={() => handlePresetSelect(preset)}
                        onValuesChange={setPresetValues}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="bg-bg-white-0 rounded-lg border border-stroke-soft p-3">
              <Form {...form}>
                <ConditionsEditor
                  query={query}
                  onQueryChange={handleQueryChange}
                  fields={ROUTE_MATCH_FIELDS}
                  saveForm={() => undefined}
                  variables={ROUTE_MATCH_VARIABLES}
                  isAllowedVariable={isAllowedRouteMatchVariable}
                  enhancedVariables={ROUTE_MATCH_ENHANCED_VARIABLES}
                  valueEditor={RouteValueEditor}
                />
              </Form>
            </div>
          )}
        </SheetMain>
        <SheetFooter className="bg-bg-white-0 mt-auto flex flex-row items-center justify-between border-t border-stroke-soft px-4 py-2.5">
          <Button
            type="button"
            variant="secondary"
            mode="ghost"
            size="xs"
            onClick={handleClear}
            disabled={isSaving || !hasExistingMatch}
          >
            Clear conditions
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              mode="outline"
              size="xs"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              mode="gradient"
              variant="secondary"
              size="xs"
              onClick={handleSave}
              isLoading={isSaving}
              disabled={tab === 'presets' && !canSavePreset}
            >
              Save conditions
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
