"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Wrench,
  Star,
  DollarSign,
  Briefcase,
  ChevronRight,
  TrendingUp,
  Calendar,
  MessageSquare,
  Award,
  MapPin,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_BASE;

const Sk = ({ className = "" }) => (
  <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />
);

function StatCard({ icon: Icon, label, value, sub, gradient, iconBg }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white ${gradient}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}
        >
          <Icon size={20} />
        </div>
        <TrendingUp size={14} className="opacity-50" />
      </div>
      <p className="text-3xl font-black mb-1">{value}</p>
      <p className="text-sm font-semibold opacity-90">{label}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 bg-white" />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-xl text-xs">
      <p className="font-bold text-gray-800 mb-1 max-w-[140px] truncate">
        {label}
      </p>
      <p className="text-lime-700 font-black text-base">
        ₦{payload[0].value?.toLocaleString()}
      </p>
    </div>
  );
};

const QUICK_LINKS = [
  {
    label: "Browse Jobs",
    href: "/dashboard/handyman/jobs",
    icon: Briefcase,
    color: "bg-primary-50 text-primary-600",
  },
  {
    label: "Interviews",
    href: "/dashboard/handyman/interviews",
    icon: Calendar,
    color: "bg-blue-50 text-blue-600",
  },
  {
    label: "Messages",
    href: "/dashboard/handyman/messages",
    icon: MessageSquare,
    color: "bg-lime-50 text-lime-700",
  },
];

export default function HandymanDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/jobs?jobFor=handyman&limit=20`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        // Handle: plain array, { jobs: [] }, { data: [] }, or error object
        const list = Array.isArray(d)
          ? d
          : Array.isArray(d?.jobs)
            ? d.jobs
            : Array.isArray(d?.data)
              ? d.data
              : [];
        setJobs(list);
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  const completed = jobs.filter((j) => j.status === "completed").length;
  const earnings = jobs
    .filter((j) => j.status === "completed")
    .reduce((a, j) => a + (j.payment || 0), 0);
  const ratedJobs = jobs.filter((j) => j.rating > 0);
  const avgRating = ratedJobs.length
    ? ratedJobs.reduce((a, j) => a + j.rating, 0) / ratedJobs.length
    : 0;

  const chartData = jobs.slice(-8).map((j) => ({
    name: (j.title || "Job").slice(0, 14),
    earnings: j.payment || 0,
  }));

  const CHART_COLORS = [
    "#7FBA00",
    "#679500",
    "#004B23",
    "#339958",
    "#7FBA00",
    "#004B23",
    "#679500",
    "#339958",
  ];

  return (
    <ProtectedRoute allowedRoles={["handyman"]}>
      <div className="space-y-7 max-w-5xl">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              Welcome back, {user?.fullName?.split(" ")[0]} 👷
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Here's your performance overview
            </p>
          </div>
          {user?.trade && (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-bold">
              <Wrench size={14} />
              {user.trade}
            </span>
          )}
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Sk key={i} className="h-36" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={Wrench}
              label="Jobs Completed"
              value={completed}
              sub={`${jobs.length} total assignments`}
              gradient="bg-gradient-to-br from-primary-500 to-primary-700"
              iconBg="bg-white/20"
            />
            <StatCard
              icon={DollarSign}
              label="Total Earnings"
              value={`₦${earnings.toLocaleString()}`}
              sub="From completed jobs"
              gradient="bg-gradient-to-br from-lime-600 to-lime-800"
              iconBg="bg-white/20"
            />
            <StatCard
              icon={Star}
              label="Average Rating"
              value={
                avgRating > 0 ? `${avgRating.toFixed(1)} ⭐` : "No ratings yet"
              }
              sub={
                ratedJobs.length > 0
                  ? `From ${ratedJobs.length} reviews`
                  : "Complete jobs to earn ratings"
              }
              gradient="bg-gradient-to-br from-amber-500 to-amber-700"
              iconBg="bg-white/20"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-black text-gray-900 text-sm">
                  Earnings Per Job
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Last 8 assignments
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 bg-lime-50 text-lime-700 rounded-xl border border-lime-100">
                ₦{earnings.toLocaleString()} total
              </span>
            </div>
            {loading ? (
              <Sk className="h-52" />
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                  <TrendingUp size={20} className="text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-600">
                  No earnings data yet
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Complete jobs to see your chart
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={32}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "#f8f8f8", radius: 8 }}
                  />
                  <Bar dataKey="earnings" radius={[8, 8, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Quick links */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-black text-gray-900 text-sm mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                {QUICK_LINKS.map(({ label, href, icon: Icon, color }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}
                    >
                      <Icon size={15} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">
                      {label}
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-gray-300 ml-auto group-hover:text-gray-500 transition"
                    />
                  </Link>
                ))}
              </div>
            </div>

            {/* Profile card */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-5 text-white">
              <h3 className="font-bold text-primary-100 text-xs uppercase tracking-wide mb-4">
                Your Profile
              </h3>
              <div className="space-y-2.5 text-sm">
                {user?.trade && (
                  <div className="flex items-center gap-2">
                    <Wrench size={13} className="text-primary-300" />
                    <span className="font-semibold">{user.trade}</span>
                  </div>
                )}
                {user?.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-primary-300" />
                    <span>{user.location}</span>
                  </div>
                )}
                {user?.yearsExperience > 0 && (
                  <div className="flex items-center gap-2">
                    <Award size={13} className="text-primary-300" />
                    <span>{user.yearsExperience} years experience</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
