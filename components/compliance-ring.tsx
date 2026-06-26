import { cn } from "@/lib/utils";
import { getHealthStatus } from "@/lib/compliance-score";

type ComplianceRingProps = {
  score: number;
  size?: "sm" | "lg";
  showStatus?: boolean;
};

export function ComplianceRing({ score, size = "lg", showStatus = true }: ComplianceRingProps) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const dimensions = size === "lg" ? "h-40 w-40" : "h-28 w-28";
  const status = getHealthStatus(score);

  return (
    <div className={cn("relative grid place-items-center", dimensions)}>
      <svg viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={radius} stroke="#efe7ff" strokeWidth="12" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke={status.ringColor}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <p className={cn("font-bold text-cedur-800", size === "lg" ? "text-4xl" : "text-2xl")}>{score}%</p>
        {showStatus ? (
          <p className={cn("text-xs font-semibold", status.colorClass)}>{status.label}</p>
        ) : (
          <p className="text-xs font-semibold text-muted-foreground">Score</p>
        )}
      </div>
    </div>
  );
}
