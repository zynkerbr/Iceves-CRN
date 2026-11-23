import React from 'react';
import { ResponsiveContainer, Tooltip, Legend } from 'recharts';

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: Record<string, string>;
  }
>;

export function ChartContainer({
  id,
  className = '',
  children,
  config,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  id?: string;
  config: ChartConfig;
  children: React.ReactElement;
}) {
  const chartId = React.useId();
  const uniqueId = id || chartId;

  // Build CSS variables from config
  const styleVariables = Object.entries(config).reduce(
    (acc, [key, value]) => {
      if (value.color) {
        acc[`--color-${key}`] = value.color;
      }
      return acc;
    },
    {} as Record<string, string>
  );

  return (
    <div
      data-chart={uniqueId}
      className={`flex aspect-video justify-center text-xs ${className}`}
      style={styleVariables as React.CSSProperties}
      {...props}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export const ChartTooltip = Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-2.5 shadow-md text-xs text-[var(--ink)]">
      {label && <p className="font-bold mb-1.5">{label}</p>}
      <div className="flex flex-col gap-1">
        {payload.map((item, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color || item.stroke || item.fill }}
              />
              <span className="text-[var(--ink2)] font-medium capitalize">{item.name || item.dataKey}:</span>
            </div>
            <span className="font-bold tabular-nums text-[var(--ink)]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ChartLegend = Legend;

export function ChartLegendContent({ payload }: { payload?: any[] }) {
  if (!payload?.length) return null;

  return (
    <div className="flex items-center justify-center gap-4 pt-3 text-xs text-[var(--ink2)]">
      {payload.map((item, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-medium text-[var(--ink)] capitalize">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
