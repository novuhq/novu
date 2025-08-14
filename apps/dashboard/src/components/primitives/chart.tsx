import * as React from 'react';
import { IconType } from 'react-icons/lib';
import * as RechartsPrimitive from 'recharts';

import { cn } from '@/utils/ui';

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> });
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }

  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = 'Chart';

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme || config.color);

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join('\n')}
}
`
          )
          .join('\n'),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<'div'> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: 'line' | 'dot' | 'dashed';
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const [item] = payload;
      const key = `${labelKey || item?.dataKey || item?.name || 'value'}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      const value =
        !labelKey && typeof label === 'string'
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label;

      if (labelFormatter) {
        return <div className={cn('font-medium', labelClassName)}>{labelFormatter(value, payload)}</div>;
      }

      if (!value) {
        return null;
      }

      return <div className={cn('font-medium', labelClassName)}>{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = payload.length === 1 && indicator !== 'dot';

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-32 items-start gap-1.5 rounded-8 border border-stroke-soft bg-background px-2.5 py-1.5 text-paragraph-2xs shadow-xl',
          className
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || 'value'}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color || item.payload.fill || item.color;

            return (
              <div
                key={item.dataKey}
                className={cn(
                  'flex w-full flex-wrap items-stretch gap-2 [&>svg]:size-2.5 [&>svg]:text-text-soft',
                  indicator === 'dot' && 'items-center'
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn('shrink-0 rounded-4 border-[--color-border] bg-[--color-bg]', {
                            'size-2.5': indicator === 'dot',
                            'w-1': indicator === 'line',
                            'w-0 border-[1.5px] border-dashed bg-transparent': indicator === 'dashed',
                            'my-0.5': nestLabel && indicator === 'dashed',
                          })}
                          style={
                            {
                              '--color-bg': indicatorColor,
                              '--color-border': indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        'flex flex-1 justify-between leading-none',
                        nestLabel ? 'items-end' : 'items-center'
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-text-soft">{itemConfig?.label || item.name}</span>
                      </div>
                      {item.value && (
                        <span className="font-code font-medium tabular-nums text-text-strong">
                          {item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = 'ChartTooltip';

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> &
    Pick<RechartsPrimitive.LegendProps, 'payload' | 'verticalAlign'> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(({ className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey }, ref) => {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn('flex items-center justify-center gap-4', verticalAlign === 'top' ? 'pb-12' : 'pt-12', className)}
    >
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || 'value'}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);

        return (
          <div key={item.value} className={cn('flex items-center gap-1.5 [&>svg]:size-3 [&>svg]:text-text-soft')}>
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="size-2 shrink-0 rounded-4"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = 'ChartLegend';

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }

  const payloadPayload =
    'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === 'string') {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

type NovuTooltipRow = {
  key: string;
  label: string;
  value: number;
  color: string;
  icon?: IconType;
};

type TooltipPayloadItem = {
  dataKey: string;
  name?: string;
  value: number;
  color?: string;
  stroke?: string;
  fill?: string;
};

type NovuTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  rows?: NovuTooltipRow[];
  showTotal?: boolean;
  title?: string;
  dateFormatter?: (date: string) => string;
};

const NovuTooltip = React.forwardRef<HTMLDivElement, NovuTooltipProps>(
  ({ active, payload, label, rows, showTotal = true, title, dateFormatter }, ref) => {
    if (!active || (!payload && !rows) || (!payload && !rows?.length)) {
      return null;
    }

    // Generate rows from payload if not provided
    const tooltipRows: NovuTooltipRow[] =
      rows ||
      payload?.map((item) => ({
        key: item.dataKey,
        label: item.name || item.dataKey,
        value: item.value,
        color: item.color || item.stroke || item.fill || '#000',
      })) ||
      [];

    const total = tooltipRows.reduce((sum, row) => sum + row.value, 0);
    const shouldShowTotal = showTotal && tooltipRows.length > 1;

    const displayTitle = title || (dateFormatter ? dateFormatter(label || '') : label);

    return (
      <div ref={ref} className="bg-bg-white relative rounded-8 border border-stroke-soft shadow-xl">
        <div className="flex flex-col gap-1.5 items-start justify-start p-1.5">
          <div className="flex flex-col font-medium justify-center text-text-soft text-paragraph-2xs text-left">
            <p>{displayTitle}</p>
          </div>
          <div className="flex flex-col gap-1 items-start justify-start min-w-40 w-full">
            {tooltipRows.map((row) => (
              <div key={row.key} className="flex flex-row items-center justify-between w-full gap-4">
                <div className="flex flex-row items-center min-w-0 flex-1">
                  <div className="flex flex-row gap-1 items-center justify-start">
                    <div className="flex flex-row gap-2 items-center justify-start">
                      <div className="h-3.5 rounded-4 w-1" style={{ backgroundColor: row.color }} />
                    </div>
                    {row.icon && (
                      <div className="flex flex-row gap-2 items-center justify-center size-3">
                        <div className="flex items-center justify-center size-3.5">
                          <row.icon className="size-full text-text-sub" />
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col font-medium justify-center text-text-sub text-paragraph-2xs text-left max-w-30">
                      <p className="capitalize truncate">{row.label}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col font-normal justify-center text-text-sub text-code-2xs text-nowrap text-right font-code flex-shrink-0">
                  <p className="whitespace-pre">{row.value.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          {shouldShowTotal && (
            <>
              <div className="flex flex-row gap-2 items-center justify-center w-full">
                <div className="grow h-0 border-t border-stroke-soft" />
              </div>
              <div className="flex flex-row items-center justify-between w-full gap-4">
                <div className="flex flex-row items-center min-w-0 flex-1">
                  <div className="flex flex-row gap-1 items-center justify-start">
                    <div className="flex flex-row gap-2 items-center justify-start">
                      <div className="bg-neutral-200 h-3.5 rounded-4 w-1" />
                    </div>
                    <div className="flex flex-col font-medium justify-center text-text-sub text-paragraph-2xs text-left">
                      <p className="capitalize">Total</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col font-normal justify-center text-text-sub text-code-2xs text-nowrap text-right font-code flex-shrink-0">
                  <p className="whitespace-pre">{total.toLocaleString()}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);
NovuTooltip.displayName = 'NovuTooltip';

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, NovuTooltip, ChartStyle };
