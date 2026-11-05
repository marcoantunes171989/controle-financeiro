import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtMoeda, fmtPercentual } from "../../utils/format";

interface Trend {
  value: number;
  label: string;
}

interface KpiCardProps {
  title: string;
  value: number;
  prefix?: string;
  format?: "moeda" | "numero" | "percentual";
  icon?: React.ReactNode;
  trend?: Trend;
  colorVariant?: "green" | "red" | "blue" | "amber";
}

const colors = {
  green: "border-emerald-400 text-emerald-600 bg-emerald-50",
  red: "border-red-400 text-destructive bg-red-50",
  blue: "border-blue-400 text-blue-600 bg-blue-50",
  amber: "border-amber-400 text-amber-600 bg-amber-50",
};

export default function KpiCard({
  title,
  value,
  format = "moeda",
  icon,
  trend,
  colorVariant = "blue",
}: KpiCardProps) {
  const formatted =
    format === "moeda"
      ? fmtMoeda(value)
      : format === "percentual"
      ? fmtPercentual(value)
      : value.toLocaleString("pt-BR");

  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm border-l-4 p-4 sm:p-5 flex flex-col gap-2", colors[colorVariant])}>
      <div className="flex items-center gap-2 sm:gap-3">
        {icon && (
          <div className={cn("p-2 sm:p-2.5 rounded-lg shrink-0", colors[colorVariant])}>
            {icon}
          </div>
        )}
        <p className="flex-1 min-w-0 text-xs font-medium text-muted-foreground uppercase tracking-wide break-words">{title}</p>
      </div>
      <p className="text-xl sm:text-2xl font-semibold text-foreground break-words w-full">{formatted}</p>
      {trend && (
        <div className={cn("flex items-center gap-1 text-xs", trend.value >= 0 ? "text-emerald-600" : "text-destructive")}>
          {trend.value >= 0 ? <TrendingUp size={12} className="shrink-0" /> : <TrendingDown size={12} className="shrink-0" />}
          <span>{Math.abs(trend.value).toFixed(1)}% {trend.label}</span>
        </div>
      )}
    </div>
  );
}
