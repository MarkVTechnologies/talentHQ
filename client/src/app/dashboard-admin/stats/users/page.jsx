"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { useSuperAdminAuthRedirect } from "@/app/utils/superAdminAuthRedirect";
import { Users, CheckCircle2, AlertCircle } from "lucide-react";
import { RangeTabs, KpiTile, ChartCard, ChartTooltip, FunnelMeter } from "@/components/AnalyticsUI";
import SavedViewsBar from "@/components/SavedViewsBar";

const API = process.env.NEXT_PUBLIC_API_BASE;

// Roles are a genuine nominal identity (3 distinct populations) — validated
// categorical triad drawn from hues already present in this app's own
// Tailwind scale (primary-400 green, custom blue-500, default amber-500).
const ROLE_COLORS = { jobseeker: "#339958", handyman: "#1900FF", employer: "#f59e0b" };
const PLAN_COLORS = { free: "#9ca3af", paid: "#679500" };
const VERIF_COLORS = { unverified: "#9ca3af", pending: "#f59e0b", verified: "#679500", rejected: "#ef4444" };

function Toast({ message, type }) {
  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold ${
        type === "error" ? "bg-red-600 text-white" : "bg-lime-600 text-white"
      }`}
    >
      {type === "error" ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
      {message}
    </div>
  );
}

export default function UserAnalyticsPage() {
  const isAuthorized = useSuperAdminAuthRedirect();
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("superadminToken");
      const res = await axios.get(`${API}/api/superadmin/analytics/users`, {
        params: { range },
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setData(res.data);
    } catch {
      notify("Failed to load user analytics", "error");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (isAuthorized) fetchData();
  }, [fetchData, isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-lime-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const planRows = data
    ? ["jobseeker", "handyman", "employer"].map((role) => ({
        role: role[0].toUpperCase() + role.slice(1),
        free: data.planBreakdown[role].free,
        paid: data.planBreakdown[role].paid,
      }))
    : [];

  const verifRows = data
    ? Object.entries(data.employerVerificationFunnel).map(([status, count]) => ({ status, count }))
    : [];

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Users size={22} className="text-primary-500" /> User Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Signups, plan mix and onboarding across jobseekers, handymen and employers
          </p>
        </div>
        <RangeTabs value={range} onChange={setRange} />
      </div>

      <SavedViewsBar page="users" range={range} onApply={setRange} notify={notify} />

      {loading || !data ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiTile label="Jobseekers" value={data.totals.jobseeker.toLocaleString()} />
            <KpiTile label="Handymen" value={data.totals.handyman.toLocaleString()} />
            <KpiTile label="Employers" value={data.totals.employer.toLocaleString()} />
          </div>

          {/* Signups over time */}
          <ChartCard
            title="Signups over time"
            subtitle={`New accounts per day, by role — trailing ${range}`}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.signupsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                <Line
                  type="monotone"
                  dataKey="jobseeker"
                  stroke={ROLE_COLORS.jobseeker}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="handyman"
                  stroke={ROLE_COLORS.handyman}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="employer"
                  stroke={ROLE_COLORS.employer}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Plan breakdown */}
            <ChartCard title="Plan mix" subtitle="Free vs paid accounts, per role">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={planRows} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="role"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8f8f8" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                  <Bar dataKey="free" fill={PLAN_COLORS.free} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="paid" fill={PLAN_COLORS.paid} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Employer verification funnel */}
            <ChartCard
              title="Employer verification"
              subtitle="Current status across all employers"
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={verifRows} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    className="capitalize"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8f8f8" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {verifRows.map((r) => (
                      <Cell key={r.status} fill={VERIF_COLORS[r.status] || "#9ca3af"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Onboarding funnel */}
          <ChartCard
            title="Onboarding funnel"
            subtitle="Total signups → email verified → onboarding complete"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {["jobseeker", "handyman", "employer"].map((role) => {
                const f = data.onboardingFunnel[role];
                return (
                  <div key={role} className="space-y-3">
                    <p className="text-xs font-black text-gray-700 capitalize">{role}s</p>
                    <FunnelMeter label="Total" value={f.total} total={f.total} colorClass="bg-gray-400" />
                    <FunnelMeter
                      label="Email verified"
                      value={f.emailVerified}
                      total={f.total}
                      colorClass="bg-primary-400"
                    />
                    <FunnelMeter
                      label="Onboarding complete"
                      value={f.onboarded}
                      total={f.total}
                      colorClass="bg-lime-600"
                    />
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
}
