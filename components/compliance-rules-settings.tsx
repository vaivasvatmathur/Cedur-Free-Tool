"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ComplianceRule, ComplianceRuleMap, PTRule } from "@/types/payroll";
import {
  defaultComplianceRules,
  defaultPTRules,
  getAllRules,
  getPTRules,
  rulesToMap,
  updatePTRules,
  updateRules
} from "@/lib/services/ruleService";

type PendingAction = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
};

const ruleDescriptions = rulesToMap(defaultComplianceRules.map((rule) => ({ ...rule, rule_value: rule.description })));

const sections = [
  {
    title: "EPF Configuration",
    description: "Controls employee and employer Provident Fund calculations.",
    fields: [
      { key: "EPF_EMPLOYEE_RATE", label: "Employee EPF %" },
      { key: "EPF_EMPLOYER_RATE", label: "Employer EPF %" },
      { key: "PF_THRESHOLD", label: "PF Threshold" }
    ]
  },
  {
    title: "EPS Configuration",
    description: "Controls employer pension contribution calculations.",
    fields: [
      { key: "EPS_RATE", label: "EPS %" },
      { key: "EPS_MAX_AMOUNT", label: "Maximum EPS Amount" }
    ]
  },
  {
    title: "ESI Configuration",
    description: "Controls ESI eligibility and contribution calculations.",
    fields: [
      { key: "ESI_EMPLOYEE_RATE", label: "Employee ESI %" },
      { key: "ESI_EMPLOYER_RATE", label: "Employer ESI %" },
      { key: "ESI_THRESHOLD", label: "ESI Salary Threshold" }
    ]
  },
  {
    title: "HRA Configuration",
    description: "Controls HRA exemption calculation percentages.",
    fields: [
      { key: "HRA_METRO_PERCENT", label: "Metro %" },
      { key: "HRA_NON_METRO_PERCENT", label: "Non-Metro %" },
      { key: "HRA_RENT_DEDUCTION_PERCENT", label: "Rent Deduction %" }
    ]
  }
];

export function ComplianceRulesSettings() {
  const [rules, setRules] = useState<ComplianceRuleMap>(() => rulesToMap(defaultComplianceRules));
  const [ptRows, setPTRows] = useState<PTRule[]>(defaultPTRules);
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([getAllRules(true), getPTRules(true)]).then(([loadedRules, loadedPTRules]) => {
      if (!mounted) return;
      setRules(rulesToMap(loadedRules));
      setPTRows(loadedPTRules);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const ruleRows = useMemo(
    () =>
      defaultComplianceRules.map((rule) => ({
        ...rule,
        rule_value: rules[rule.rule_key] ?? rule.rule_value
      })),
    [rules]
  );

  function updateRuleValue(ruleKey: string, value: string) {
    setRules((current) => ({ ...current, [ruleKey]: value }));
  }

  function updatePTRow(index: number, patch: Partial<PTRule>) {
    setPTRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function saveRuleGroup(title: string, keys: string[]) {
    setPendingAction({
      title: `Save ${title}`,
      message: "Future payroll validations will use these rule values immediately after saving.",
      confirmLabel: "Save Changes",
      onConfirm: async () => {
        setIsSaving(true);
        const updatedRules = keys.map<ComplianceRule>((key) => ({
          rule_key: key,
          rule_value: rules[key],
          description: ruleDescriptions[key] ?? ""
        }));
        const savedRules = await updateRules(updatedRules);
        setRules(rulesToMap(savedRules));
        setNotice(`${title} saved.`);
        setIsSaving(false);
      }
    });
  }

  function confirmDeletePTRow(index: number) {
    setPendingAction({
      title: "Delete PT Row",
      message: "This row will be removed from the editable table. Save the PT configuration to persist the deletion.",
      confirmLabel: "Delete Row",
      onConfirm: () => {
        setPTRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
        setNotice("PT row removed. Save PT configuration to persist.");
      }
    });
  }

  function savePTRuleTable() {
    setPendingAction({
      title: "Save Professional Tax Configuration",
      message: "This will replace the active Professional Tax slab table used by future validations.",
      confirmLabel: "Save PT Rules",
      onConfirm: async () => {
        setIsSaving(true);
        const savedRows = await updatePTRules(ptRows);
        setPTRows(savedRows);
        setNotice("Professional Tax rules saved.");
        setIsSaving(false);
      }
    });
  }

  async function runPendingAction() {
    if (!pendingAction) return;
    await pendingAction.onConfirm();
    setPendingAction(null);
    window.setTimeout(() => setNotice(""), 3600);
  }

  return (
    <>
      <div className="space-y-6">
        {notice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {notice}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      type="number"
                      value={rules[field.key] ?? ""}
                      onChange={(event) => updateRuleValue(field.key, event.target.value)}
                    />
                  </div>
                ))}
                <Button onClick={() => saveRuleGroup(section.title, section.fields.map((field) => field.key))} disabled={isSaving}>
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Professional Tax Configuration</CardTitle>
              <CardDescription>Editable state-wise salary slabs used by the PT validator.</CardDescription>
            </div>
            <Badge variant="outline">{ptRows.length} rows</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>State</TableHead>
                    <TableHead>Minimum Salary</TableHead>
                    <TableHead>Maximum Salary</TableHead>
                    <TableHead>PT Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ptRows.map((row, index) => (
                    <TableRow key={`${row.state}-${index}`}>
                      <TableCell>
                        <Input value={row.state} onChange={(event) => updatePTRow(index, { state: event.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={row.min_salary} onChange={(event) => updatePTRow(index, { min_salary: Number(event.target.value) })} />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.max_salary ?? ""}
                          placeholder="No upper limit"
                          onChange={(event) => updatePTRow(index, { max_salary: event.target.value === "" ? null : Number(event.target.value) })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={row.pt_amount} onChange={(event) => updatePTRow(index, { pt_amount: Number(event.target.value) })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="icon" onClick={() => confirmDeletePTRow(index)} aria-label="Delete PT row">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setPTRows([...ptRows, { state: "Maharashtra", min_salary: 0, max_salary: null, pt_amount: 0 }])}
              >
                <Plus className="h-4 w-4" />
                Add Row
              </Button>
              <Button onClick={savePTRuleTable} disabled={isSaving}>
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Rule Keys</CardTitle>
            <CardDescription>Current configurable values used by the validation engine.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {ruleRows.map((rule) => (
              <div key={rule.rule_key} className="rounded-xl border bg-white p-3">
                <p className="text-xs font-bold text-muted-foreground">{rule.rule_key}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{rule.rule_value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{pendingAction.title}</CardTitle>
              <CardDescription>{pendingAction.message}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setPendingAction(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={runPendingAction} disabled={isSaving}>
                {isSaving ? "Saving..." : pendingAction.confirmLabel}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
