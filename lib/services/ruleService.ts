import type { ComplianceRule, ComplianceRuleMap, PTRule } from "@/types/payroll";

const RULE_CACHE_KEY = "cedur-compliance-rules";
const PT_RULE_CACHE_KEY = "cedur-pt-rules";

export const defaultComplianceRules: ComplianceRule[] = [
  { rule_key: "EPF_EMPLOYEE_RATE", rule_value: "12", description: "Employee EPF percentage of Basic + DA" },
  { rule_key: "EPF_EMPLOYER_RATE", rule_value: "3.67", description: "Employer EPF percentage of Basic + DA" },
  { rule_key: "EPS_RATE", rule_value: "8.33", description: "Employer EPS percentage of Basic + DA" },
  { rule_key: "EPS_MAX_AMOUNT", rule_value: "1250", description: "Maximum monthly EPS contribution amount" },
  { rule_key: "PF_THRESHOLD", rule_value: "15000", description: "PF mandatory wage threshold" },
  { rule_key: "ESI_EMPLOYEE_RATE", rule_value: "0.75", description: "Employee ESI percentage of gross salary" },
  { rule_key: "ESI_EMPLOYER_RATE", rule_value: "3.25", description: "Employer ESI percentage of gross salary" },
  { rule_key: "ESI_THRESHOLD", rule_value: "21000", description: "ESI eligibility salary threshold" },
  { rule_key: "HRA_METRO_PERCENT", rule_value: "50", description: "HRA exemption percentage for metro cities" },
  { rule_key: "HRA_NON_METRO_PERCENT", rule_value: "40", description: "HRA exemption percentage for non-metro cities" },
  { rule_key: "HRA_RENT_DEDUCTION_PERCENT", rule_value: "10", description: "Salary percentage deducted from rent for HRA exemption" }
];

export const defaultPTRules: PTRule[] = [
  { state: "Maharashtra", min_salary: 0, max_salary: 7500, pt_amount: 0 },
  { state: "Maharashtra", min_salary: 7500.01, max_salary: 10000, pt_amount: 175 },
  { state: "Maharashtra", min_salary: 10000.01, max_salary: null, pt_amount: 200 },
  { state: "Karnataka", min_salary: 0, max_salary: 24999.99, pt_amount: 0 },
  { state: "Karnataka", min_salary: 25000, max_salary: null, pt_amount: 200 },
  { state: "Tamil Nadu", min_salary: 0, max_salary: 3500, pt_amount: 0 },
  { state: "Tamil Nadu", min_salary: 3500.01, max_salary: 5000, pt_amount: 30 },
  { state: "Tamil Nadu", min_salary: 5000.01, max_salary: 7500, pt_amount: 71 },
  { state: "Tamil Nadu", min_salary: 7500.01, max_salary: 10000, pt_amount: 155 },
  { state: "Tamil Nadu", min_salary: 10000.01, max_salary: 12500, pt_amount: 171 },
  { state: "Tamil Nadu", min_salary: 12500.01, max_salary: null, pt_amount: 208 }
];

let cachedRules: ComplianceRule[] | null = null;
let cachedPTRules: PTRule[] | null = null;

function canUseBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readStorage<T>(key: string): T | null {
  if (!canUseBrowserStorage()) return null;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!canUseBrowserStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function rulesToMap(rules: ComplianceRule[] = defaultComplianceRules): ComplianceRuleMap {
  return rules.reduce<ComplianceRuleMap>((map, rule) => {
    map[rule.rule_key] = rule.rule_value;
    return map;
  }, {});
}

export function getRuleNumber(rules: ComplianceRuleMap | undefined, ruleKey: string) {
  const fallback = rulesToMap(defaultComplianceRules)[ruleKey];
  const rawValue = rules?.[ruleKey] ?? fallback;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : Number(fallback);
}

export function percentRule(rules: ComplianceRuleMap | undefined, ruleKey: string) {
  return getRuleNumber(rules, ruleKey) / 100;
}

export function getCachedRules() {
  cachedRules = cachedRules ?? readStorage<ComplianceRule[]>(RULE_CACHE_KEY) ?? defaultComplianceRules;
  return cachedRules;
}

export function getCachedRuleMap() {
  return rulesToMap(getCachedRules());
}

export function getCachedPTRules() {
  cachedPTRules = cachedPTRules ?? readStorage<PTRule[]>(PT_RULE_CACHE_KEY) ?? defaultPTRules;
  return cachedPTRules;
}

export async function getAllRules(force = false) {
  if (!force && cachedRules) return cachedRules;
  const storedRules = readStorage<ComplianceRule[]>(RULE_CACHE_KEY);
  if (!force && storedRules?.length) {
    cachedRules = storedRules;
  }

  if (typeof fetch === "undefined") return cachedRules ?? defaultComplianceRules;

  try {
    const response = await fetch("/api/compliance-rules", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load compliance rules");
    const payload = (await response.json()) as { rules?: ComplianceRule[] };
    cachedRules = payload.rules?.length ? payload.rules : defaultComplianceRules;
    writeStorage(RULE_CACHE_KEY, cachedRules);
    return cachedRules;
  } catch {
    cachedRules = cachedRules ?? storedRules ?? defaultComplianceRules;
    return cachedRules;
  }
}

export async function getRule(ruleKey: string) {
  const rules = await getAllRules();
  return rules.find((rule) => rule.rule_key === ruleKey)?.rule_value ?? rulesToMap(defaultComplianceRules)[ruleKey];
}

export async function updateRule(ruleKey: string, ruleValue: string, description = "") {
  return updateRules([{ rule_key: ruleKey, rule_value: ruleValue, description }]);
}

export async function updateRules(rules: ComplianceRule[]) {
  if (typeof fetch === "undefined") {
    cachedRules = mergeRules(getCachedRules(), rules);
    return cachedRules;
  }

  const response = await fetch("/api/compliance-rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rules })
  });

  if (!response.ok) throw new Error("Unable to update compliance rules");
  const payload = (await response.json()) as { rules?: ComplianceRule[] };
  cachedRules = payload.rules?.length ? payload.rules : mergeRules(getCachedRules(), rules);
  writeStorage(RULE_CACHE_KEY, cachedRules);
  return cachedRules;
}

export async function getPTRules(force = false) {
  if (!force && cachedPTRules) return cachedPTRules;
  const storedRules = readStorage<PTRule[]>(PT_RULE_CACHE_KEY);
  if (!force && storedRules?.length) {
    cachedPTRules = storedRules;
  }

  if (typeof fetch === "undefined") return cachedPTRules ?? defaultPTRules;

  try {
    const response = await fetch("/api/pt-rules", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load PT rules");
    const payload = (await response.json()) as { rules?: PTRule[] };
    cachedPTRules = payload.rules?.length ? payload.rules : defaultPTRules;
    writeStorage(PT_RULE_CACHE_KEY, cachedPTRules);
    return cachedPTRules;
  } catch {
    cachedPTRules = cachedPTRules ?? storedRules ?? defaultPTRules;
    return cachedPTRules;
  }
}

export async function updatePTRules(rules: PTRule[]) {
  if (typeof fetch === "undefined") {
    cachedPTRules = rules;
    return cachedPTRules;
  }

  const response = await fetch("/api/pt-rules", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rules })
  });

  if (!response.ok) throw new Error("Unable to update PT rules");
  const payload = (await response.json()) as { rules?: PTRule[] };
  cachedPTRules = payload.rules?.length ? payload.rules : rules;
  writeStorage(PT_RULE_CACHE_KEY, cachedPTRules);
  return cachedPTRules;
}

function mergeRules(currentRules: ComplianceRule[], updates: ComplianceRule[]) {
  const byKey = new Map(currentRules.map((rule) => [rule.rule_key, rule]));
  for (const update of updates) {
    const existing = byKey.get(update.rule_key);
    byKey.set(update.rule_key, { ...existing, ...update });
  }
  return Array.from(byKey.values());
}
