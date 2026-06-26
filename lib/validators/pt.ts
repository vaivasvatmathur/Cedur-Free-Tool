import type { PayrollRow, PTRule } from "@/types/payroll";
import type { ValidationResult } from "./types";
import { defaultPTRules } from "@/lib/services/ruleService";

const PT_APPLICABLE_STATES = new Set([
  "andhra pradesh",
  "assam",
  "bihar",
  "gujarat",
  "jharkhand",
  "karnataka",
  "kerala",
  "madhya pradesh",
  "maharashtra",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "puducherry",
  "punjab",
  "sikkim",
  "tamil nadu",
  "telangana",
  "tripura",
  "west bengal"
]);

const PT_NON_APPLICABLE_STATES = new Set([
  "delhi",
  "haryana",
  "rajasthan",
  "uttar pradesh",
  "uttarakhand",
  "himachal pradesh",
  "goa",
  "chandigarh",
  "andaman and nicobar islands",
  "lakshadweep",
  "ladakh",
  "jammu and kashmir",
  "chhattisgarh",
  "odisha"
]);

export function expectedProfessionalTax(state: string, monthlyGross: number, ptRules: PTRule[] = defaultPTRules) {
  const normalizedState = state.trim().toLowerCase();
  const nonApplicable = PT_NON_APPLICABLE_STATES.has(normalizedState);
  if (nonApplicable) {
    return {
      amount: 0,
      supported: false,
      applicable: false,
      nonApplicable
    };
  }

  let stateRules = ptRules.filter((rule) => rule.state.trim().toLowerCase() === normalizedState);
  
  // Self-healing fallback: if no rules are found in the provided rules (due to outdated cache)
  // but exist in defaultPTRules, use the defaults for this state.
  if (stateRules.length === 0 && defaultPTRules.some((rule) => rule.state.trim().toLowerCase() === normalizedState)) {
    stateRules = defaultPTRules.filter((rule) => rule.state.trim().toLowerCase() === normalizedState);
  }

  const matchingRule = stateRules.find((rule) => monthlyGross >= Number(rule.min_salary) && (rule.max_salary === null || monthlyGross <= Number(rule.max_salary)));
  return {
    amount: stateRules.length ? matchingRule?.pt_amount ?? 0 : undefined,
    supported: stateRules.length > 0,
    applicable: PT_APPLICABLE_STATES.has(normalizedState),
    nonApplicable
  };
}

export function validatePT(row: PayrollRow, ptRules: PTRule[] = defaultPTRules): ValidationResult[] {
  const results: ValidationResult[] = [];
  const normalizedState = row.state.trim().toLowerCase();

  if (normalizedState === "chhattisgarh") {
    return [{
      compliant: true,
      severity: "info",
      issue: "Professional Tax is not applicable in Chhattisgarh.",
      recommendation: "Ensure no Professional Tax deductions are processed."
    }];
  }

  const pt = expectedProfessionalTax(row.state, row.grossSalary, ptRules);

  const ptDisclaimer = " Professional Tax rules vary by state and may change periodically. Results are based on configured state rules.";

  if (pt.supported && pt.amount !== undefined && Math.abs(row.professionalTax - pt.amount) > 2) {
    results.push({
      compliant: false,
      severity: "warning",
      issue: "Professional Tax deduction does not match the configured state slab.",
      recommendation: `Adjust Professional Tax to Rs. ${pt.amount.toLocaleString("en-IN")} based on the ${row.state} slab.${ptDisclaimer}`
    });
  } else if (!pt.supported && pt.nonApplicable) {
    if (row.professionalTax > 2) {
      results.push({
        compliant: false,
        severity: "warning",
        issue: "Professional Tax deduction is present for a non-applicable state.",
        recommendation: `Remove or review Professional Tax deduction because PT is not applicable in ${row.state}.${ptDisclaimer}`
      });
    }
  } else if (!pt.supported) {
    results.push({
      compliant: true,
      severity: "info",
      issue: "Professional Tax validation is currently unavailable for the selected state.",
      recommendation: (pt.applicable
        ? `Verify ${row.state} Professional Tax manually until the state slab is configured.`
        : "Confirm Professional Tax applicability manually for the selected state.") + ptDisclaimer
    });
  }

  return results;
}
