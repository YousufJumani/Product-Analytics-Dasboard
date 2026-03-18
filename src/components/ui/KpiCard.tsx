"use client";

import { clsx } from "clsx";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number; // percent change
  deltaLabel?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  accent?: "brand" | "success" | "warning" | "danger";
}

const accentColors = {
  brand: "rgba(99,102,241,0.2)",
  success: "rgba(16,185,129,0.2)",
  warning: "rgba(245,158,11,0.2)",
  danger: "rgba(239,68,68,0.2)",
};

export default function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  loading = false,
  accent = "brand",
}: KpiCardProps) {
  if (loading) {
    return (
      <div className="kpi-card">
        <div className="skeleton h-4 w-24 mb-4" />
        <div className="skeleton h-8 w-32 mb-2" />
        <div className="skeleton h-3 w-20" />
      </div>
    );
  }

  const isPositive = delta !== undefined && delta >= 0;
  const isNegative = delta !== undefined && delta < 0;

  return (
    <div className="kpi-card animate-slide-up">
      {/* Icon */}
      {icon && (
        <div
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl mb-4"
          style={{ background: accentColors[accent] }}
        >
          {icon}
        </div>
      )}

      {/* Label */}
      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">{label}</p>

      {/* Value */}
      <p className="text-3xl font-bold text-white mb-2">{value}</p>

      {/* Delta */}
      {delta !== undefined && (
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              "flex items-center gap-0.5 text-xs font-medium",
              isPositive ? "text-success" : isNegative ? "text-danger" : "text-muted"
            )}
          >
            {isPositive ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            ) : isNegative ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            ) : null}
            {Math.abs(delta).toFixed(1)}%
          </span>
          {deltaLabel && <span className="text-xs text-muted">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}
