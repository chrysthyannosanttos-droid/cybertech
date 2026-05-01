import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}

export function StatCard({ icon: Icon, label, value, change, positive }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-muted">
          <Icon size={16} className="text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold text-card-foreground">{value}</p>
      {change && (
        <p className={`mt-1 text-xs ${positive ? "text-green-400" : "text-red-400"}`}>
          {positive ? "↑" : "↓"} {change} vs. mês anterior
        </p>
      )}
    </div>
  );
}
