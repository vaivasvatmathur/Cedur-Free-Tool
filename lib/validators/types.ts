export type ValidationResult = {
  compliant: boolean;
  severity: "critical" | "warning" | "info";
  issue: string;
  recommendation: string;
  checkType?: string;
  expected?: number;
  actual?: number;
  contributionType?: string;
};
