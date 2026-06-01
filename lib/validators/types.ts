export type ValidationResult = {
  compliant: boolean;
  severity: "critical" | "warning" | "info";
  issue: string;
  recommendation: string;
};
