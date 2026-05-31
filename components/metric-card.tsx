import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "purple" | "green" | "amber" | "red" | "blue";
};

const tones = {
  purple: "bg-cedur-50 text-cedur-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-700"
};

export function MetricCard({ label, value, detail, icon: Icon, tone = "purple" }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-normal">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className={cn("rounded-2xl p-3", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
