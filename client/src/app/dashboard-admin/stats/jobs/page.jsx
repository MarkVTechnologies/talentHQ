"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { useSuperAdminAuthRedirect } from "@/app/utils/superAdminAuthRedirect";
import { Briefcase, CheckCircle2, AlertCircle } from "lucide-react";
import { RangeTabs, KpiTile, ChartCard, ChartTooltip } from "@/components/AnalyticsUI";
import SavedViewsBar from "@/components/SavedViewsBar";

const API = process.env.NEXT_PUBLIC_API_BASE;

const STATUS_COLORS = { open: "#679500", filled: "#1900FF", closed: "#9ca3af", paused: "#f59e0b" };
const JOBFOR_COLORS = { handyman: "#1900FF", professional: "#339958" };
const TYPE_COLORS = { "Full-time": "#339958", "Part-time": "#1900FF", Contract: "#f59e0b" };
const APPLICANT_ROLE_COLORS = { jobseeker: "#339958", handyman: "#1900FF" };
const FUNNEL_COLORS = { pending: "#f59e0b", reviewed: "#1900FF", accepted: "#679500", rejected: "#ef4444" };

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

function toRows(obj = {}) {
  return Object.entries(obj).map(([key, count]) => ({ key, count }));
}

export default function JobAnalyticsPage() {
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
      const res = await axios.get(`${API}/api/superadmin/analytics/jobs`, {
        params: { range },
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setData(res.data);
    } catch {
      notify("Failed to load job analytics", "error");
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

  const statusRows = data ? toRows(data.statusBreakdown) : [];
  const jobForRows = data ? toRows(data.jobForBreakdown) : [];
  const typeRows = data ? toRows(data.typeBreakdown) : [];
  const applicantRoleRows = data ? toRows(data.applicantRoleBreakdown) : [];
  const funnelRows = data ? toRows(data.applicationFunnel) : [];

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Briefcase size={22} className="text-primary-500" /> Job Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Postings, applications and conversion across the jobs board
          </p>
        </div>
        <RangeTabs value={range} onChange={setRange} />
      </div>

      <SavedViewsBar page="jobs" range={range} onApply={setRange} notify={notify} />

      {loading || !data ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiTile label="Total jobs posted" value={data.totals.jobs.toLocaleString()} />
            <KpiTile label="Total applications" value={data.totals.applications.toLocaleString()} />
          </div>

          {/* Time series */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Jobs posted over time" subtitle={`Trailing ${range}`}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.jobsOverTime}>
                  <defs>
                    <linearGradient id="jobsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#679500" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#679500" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                  <Area
                    type="monotone"
                    dataKey="jobs"
                    stroke="#679500"
                    strokeWidth={2}
                    fill="url(#jobsGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#679500" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Applications over time" subtitle={`Trailing ${range}`}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.applicationsOverTime}>
                  <defs>
                    <linearGradient id="appsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#004B23" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#004B23" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                  <Area
                    type="monotone"
                    dataKey="applications"
                    stroke="#004B23"
                    strokeWidth={2}
                    fill="url(#appsGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#004B23" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Breakdown grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Job status" subtitle="Current listing status across the board">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusRows} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="key" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} className="capitalize" />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8f8f8" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusRows.map((r) => (
                      <Cell key={r.key} fill={STATUS_COLORS[r.key] || "#9ca3af"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Employment type" subtitle="Full-time, part-time, contract">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={typeRows} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="key" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8f8f8" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {typeRows.map((r) => (
                      <Cell key={r.key} fill={TYPE_COLORS[r.key] || "#9ca3af"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Job segment" subtitle="Handyman/trade vs professional roles">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={jobForRows} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="key" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} className="capitalize" />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8f8f8" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {jobForRows.map((r) => (
                      <Cell key={r.key} fill={JOBFOR_COLORS[r.key] || "#9ca3af"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Applicant type" subtitle="Who's applying — jobseekers vs handymen">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={applicantRoleRows} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="key" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} className="capitalize" />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8f8f8" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {applicantRoleRows.map((r) => (
                      <Cell key={r.key} fill={APPLICANT_ROLE_COLORS[r.key] || "#9ca3af"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Top categories */}
          <ChartCard title="Top job categories" subtitle="Most-posted categories, all time">
            <ResponsiveContainer width="100%" height={Math.max(200, data.categoryBreakdown.length * 34)}>
              <BarChart
                data={data.categoryBreakdown}
                layout="vertical"
                margin={{ left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 11, fill: "#374151" }}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8f8f8" }} />
                <Bar dataKey="count" fill="#679500" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Application funnel */}
          <ChartCard title="Application funnel" subtitle="Status of every application submitted">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelRows} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="key" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} className="capitalize" />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8f8f8" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {funnelRows.map((r) => (
                    <Cell key={r.key} fill={FUNNEL_COLORS[r.key] || "#9ca3af"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}
