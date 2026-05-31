"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { monthlyCompliance } from "@/lib/sample-data";

export function MonthlyComplianceChart() {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={monthlyCompliance}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e2f5" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "#f7f3ff" }} />
          <Bar dataKey="compliant" fill="#22b8cf" radius={[8, 8, 0, 0]} />
          <Bar dataKey="warnings" fill="#f59e0b" radius={[8, 8, 0, 0]} />
          <Bar dataKey="critical" fill="#ef4444" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PayrollTrendChart() {
  const data = monthlyCompliance.map((item) => ({ ...item, score: item.compliant - item.critical }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e2f5" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} />
          <Tooltip />
          <Line type="monotone" dataKey="score" stroke="#835ef5" strokeWidth={3} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="warnings" stroke="#14b8a6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
