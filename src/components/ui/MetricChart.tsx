"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { format } from "date-fns";

interface DataPoint {
  date: string | Date;
  [key: string]: string | number | Date;
}

interface Series {
  key: string;
  label: string;
  color: string;
}

interface MetricChartProps {
  data: DataPoint[];
  series: Series[];
  type?: "line" | "area" | "bar";
  height?: number;
  formatValue?: (v: number) => string;
  formatDate?: (d: string) => string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatValue: (v: number) => string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-4 py-3 rounded-xl text-sm"
      style={{
        background: "rgba(10,10,20,0.95)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      <p className="text-muted text-xs mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-secondary-color">{p.name}:</span>
          <span className="font-semibold text-white">{formatValue(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function MetricChart({
  data,
  series,
  type = "line",
  height = 280,
  formatValue = (v) => String(v),
  formatDate = (d) => format(new Date(d), "MMM d"),
}: MetricChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    _label: formatDate(String(d.date)),
  }));

  const commonProps = {
    data: formattedData,
    margin: { top: 8, right: 8, left: 0, bottom: 0 },
  };

  const axisStyle = {
    fill: "rgba(255,255,255,0.4)",
    fontSize: 11,
  };

  const renderContent = () => {
    if (type === "area") {
      return (
        <AreaChart {...commonProps}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="_label" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={formatValue} width={60} />
          <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }} />}
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label}
              stroke={s.color} strokeWidth={2} fill={`url(#grad-${s.key})`} dot={false} />
          ))}
        </AreaChart>
      );
    }

    if (type === "bar") {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="_label" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={formatValue} width={60} />
          <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }} />}
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color}
              radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} opacity={0.85} />
          ))}
        </BarChart>
      );
    }

    // Default: line
    return (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="_label" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={formatValue} width={60} />
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }} />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
            stroke={s.color} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: s.color }} />
        ))}
      </LineChart>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      {renderContent()}
    </ResponsiveContainer>
  );
}
