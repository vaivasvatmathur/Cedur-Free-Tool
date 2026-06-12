"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComplianceRule, PTRule } from "@/types/payroll";
import {
  getAllRules,
  getCachedPTRules,
  getCachedRules,
  getPTRules,
  rulesToMap
} from "@/lib/services/ruleService";

export function useComplianceRules() {
  const [rules, setRules] = useState<ComplianceRule[]>(() => getCachedRules());
  const [ptRules, setPTRules] = useState<PTRule[]>(() => getCachedPTRules());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([getAllRules(true), getPTRules(true)])
      .then(([nextRules, nextPTRules]) => {
        if (!mounted) return;
        setRules(nextRules);
        setPTRules(nextPTRules);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    rules,
    ruleMap: useMemo(() => rulesToMap(rules), [rules]),
    ptRules,
    isLoading
  };
}
