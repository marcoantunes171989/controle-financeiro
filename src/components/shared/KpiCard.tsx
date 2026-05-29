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
    <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm border-l-4 p-5 flex items-start gap-4", colors[colorVariant])}>
      {icon && (
        <div className={cn("p-2.5 rounded-lg", colors[colorVariant])}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-semibold text-foreground mt-1">{formatted}</p>
        {trend && (
          <div className={cn("flex items-center gap-1 mt-1.5 text-xs", trend.value >= 0 ? "text-emerald-600" : "text-destructive")}>
            {trend.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{Math.abs(trend.value).toFixed(1)}% {trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
