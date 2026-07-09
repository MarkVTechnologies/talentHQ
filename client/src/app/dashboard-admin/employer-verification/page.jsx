"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useSuperAdminAuthRedirect } from "@/app/utils/superAdminAuthRedirect";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Shield,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE;

const TABS = ["pending", "verified", "rejected", "unverified", "all"];

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  verified: "bg-lime-50 text-lime-700 border-lime-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  unverified: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_ICONS = {
  pending: ShieldAlert,
  verified: ShieldCheck,
  rejected: ShieldX,
  unverified: Shield,
};

// Older employers who typed a CAC number before this feature existed have no
// explicit verificationStatus yet — the backend buckets those as "pending" too,
// so the badge here mirrors that same implicit rule for display.
function effectiveStatus(employer) {
  if (employer.verificationStatus === "verified") return "verified";
  if (employer.verificationStatus === "rejected") return "rejected";
  return employer.cacNumber?.trim() ? "pending" : "unverified";
}

function StatusBadge({ status }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize ${STATUS_STYLES[status]}`}
    >
      <Icon size={11} />
      {status}
    </span>
  );
}

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

function EmployerCard({ employer, onResolve, onRevoke }) {
  const [expanding, setExpanding] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const status = effectiveStatus(employer);

  const handleResolve = async (nextStatus) => {
    setLoading(true);
    await onResolve(employer._id, nextStatus, note);
    setLoading(false);
    setExpanding(false);
  };

  const handleRevoke = async () => {
    setLoading(true);
    await onRevoke(employer._id);
    setLoading(false);
  };

  return (
    <div
      className={`bg-white rounded-2xl border p-5 transition-shadow hover:shadow-sm ${
        status === "pending"
          ? "border-amber-200 border-l-4 border-l-amber-400"
          : "border-gray-100"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {employer.logo ? (
            <img
              src={employer.logo}
              alt=""
              className="w-10 h-10 rounded-xl object-contain bg-gray-50 flex-shrink-0 border border-gray-100"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Building2 size={16} className="text-primary-400" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-black text-gray-900 text-sm truncate">
                {employer.companyName || "—"}
              </p>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {employer.fullName} · {employer.email}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end">
            <Clock size={9} />
            {new Date(employer.createdAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          {(employer.industry || employer.state) && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {[employer.industry, employer.state].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-gray-50 rounded-xl p-3 border border-gray-100">
        <p>
          <span className="text-gray-400 font-semibold">CAC Number:</span>{" "}
          <span className="text-gray-700 font-bold">
            {employer.cacNumber?.trim() || "Not provided"}
          </span>
        </p>
        <p>
          <span className="text-gray-400 font-semibold">Company Email:</span>{" "}
          <span className="text-gray-700">{employer.companyEmail || "—"}</span>
        </p>
      </div>

      {employer.verificationNote && (
        <div className="mt-3 px-3 py-2 bg-gray-50 rounded-xl text-xs text-gray-600 border border-gray-100">
          <span className="font-semibold text-gray-700">Admin note:</span>{" "}
          {employer.verificationNote}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        {status === "verified" || status === "rejected" ? (
          <button
            onClick={handleRevoke}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 font-semibold text-xs rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RotateCcw size={12} />
            )}
            Revoke &amp; reset to unverified
          </button>
        ) : !expanding ? (
          <div className="flex gap-2">
            <button
              onClick={() => setExpanding(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary-50 text-primary-700 font-semibold text-xs rounded-xl hover:bg-primary-100 transition"
            >
              <ShieldCheck size={12} /> Review
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (e.g. CAC confirmed, or reason for rejection)..."
              className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 bg-gray-50 resize-none"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleResolve("verified")}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-lime-600 hover:bg-lime-700 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                Approve
              </button>
              <button
                onClick={() => handleResolve("rejected")}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
              >
                <XCircle size={12} /> Reject
              </button>
              <button
                onClick={() => setExpanding(false)}
                className="px-3 py-2 text-gray-400 text-xs hover:text-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmployerVerificationPage() {
  const isAuthorized = useSuperAdminAuthRedirect();
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchEmployers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("superadminToken");
      const res = await axios.get(`${API}/api/superadmin/employer-verifications`, {
        params: { status: statusFilter, search: debouncedSearch, page, limit: 20 },
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setEmployers(res.data.employers || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
      setCounts(res.data.counts || {});
    } catch {
      notify("Failed to load employer verifications", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, page]);

  useEffect(() => {
    if (isAuthorized) fetchEmployers();
  }, [fetchEmployers, isAuthorized]);

  const handleResolve = async (id, status, note) => {
    try {
      const token = localStorage.getItem("superadminToken");
      await axios.patch(
        `${API}/api/superadmin/employer-verifications/${id}`,
        { status, note },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true },
      );
      notify(`Employer marked as ${status}`);
      fetchEmployers();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update verification", "error");
    }
  };

  const handleRevoke = async (id) => {
    try {
      const token = localStorage.getItem("superadminToken");
      await axios.delete(`${API}/api/superadmin/employer-verifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      notify("Verification reset to unverified");
      fetchEmployers();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to reset verification", "error");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-lime-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ShieldCheck size={22} className="text-primary-500" /> Employer
            Verification
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} employer{total !== 1 ? "s" : ""} in{" "}
            {statusFilter === "all" ? "the platform" : `the "${statusFilter}" queue`}
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition capitalize ${
              statusFilter === s
                ? "bg-primary-500 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {s}{" "}
            {typeof counts[s] === "number" && counts[s] > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${
                  statusFilter === s ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {counts[s]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company, name or email…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white placeholder:text-gray-400 transition"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : employers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <ShieldCheck size={24} className="text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-800 mb-1">No employers here</h3>
          <p className="text-sm text-gray-400">
            {debouncedSearch
              ? `No results for "${debouncedSearch}"`
              : statusFilter === "pending"
                ? "No employers awaiting review."
                : `No ${statusFilter} employers.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {employers.map((employer) => (
            <EmployerCard
              key={employer._id}
              employer={employer}
              onResolve={handleResolve}
              onRevoke={handleRevoke}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm text-gray-600 font-semibold px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
