"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSuperAdminAuthRedirect } from "@/app/utils/superAdminAuthRedirect";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Loader2,
  ExternalLink,
  Clock,
  Filter,
  Plus,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE;

const Sk = ({ className = "" }) => (
  <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />
);

const STATUS_TABS = ["pending", "reviewed", "actioned", "dismissed", "all"];

const STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  reviewed: "bg-blue-50 text-blue-700 border-blue-200",
  actioned: "bg-lime-50 text-lime-700 border-lime-200",
  dismissed: "bg-gray-100 text-gray-500 border-gray-200",
};

// Same reason taxonomy end users see in FlagButton, kept in sync so admin
// manually-created reports use reasons that mean the same thing everywhere.
const REASONS = {
  job: [
    { value: "fraudulent_job", label: "Fraudulent or scam job posting" },
    { value: "misleading_info", label: "Misleading job description or salary" },
    { value: "inappropriate_content", label: "Inappropriate or offensive content" },
    { value: "spam", label: "Spam or repeated posting" },
    { value: "other", label: "Other reason" },
  ],
  employer: [
    { value: "fake_profile", label: "Fake or impersonating company" },
    { value: "fraudulent_job", label: "Associated with fraudulent listings" },
    { value: "harassment", label: "Harassing users" },
    { value: "misleading_info", label: "Misleading company information" },
    { value: "other", label: "Other reason" },
  ],
  handyman: [
    { value: "fake_profile", label: "Fake or impersonating profile" },
    { value: "misleading_info", label: "False skills or certifications" },
    { value: "harassment", label: "Harassing users" },
    { value: "other", label: "Other reason" },
  ],
  jobseeker: [
    { value: "fake_profile", label: "Fake or impersonating profile" },
    { value: "misleading_info", label: "False experience or credentials" },
    { value: "harassment", label: "Harassing users" },
    { value: "other", label: "Other reason" },
  ],
  review: [
    { value: "false_review", label: "Factually false or inaccurate" },
    { value: "defamatory_review", label: "Defamatory or malicious" },
    { value: "spam", label: "Spam or fake review" },
    { value: "inappropriate_content", label: "Inappropriate language" },
    { value: "other", label: "Other reason" },
  ],
};

const REASON_LABELS = Object.values(REASONS)
  .flat()
  .reduce((acc, r) => ({ ...acc, [r.value]: r.label }), {});

const TARGET_LINKS = {
  job: (id) => `/findjob/${id}`,
  employer: (id) => `/employers/${id}`,
  handyman: (id) => `/handymen/${id}`,
  jobseeker: () => null,
  review: () => null,
};

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

function DeleteDialog({ onConfirm, onClose, deleting }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h3 className="font-black text-gray-900 text-base mb-1">
          Delete this report?
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          This permanently removes the report record. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl transition disabled:opacity-60"
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateReportModal({ allowedTypes, onClose, onCreate, creating }) {
  const [targetType, setTargetType] = useState(allowedTypes[0]);
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");

  const reasons = REASONS[targetType] || REASONS.other || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetId.trim() || !reason) {
      setError("Target ID and reason are required");
      return;
    }
    setError("");
    const err = await onCreate({ targetType, targetId: targetId.trim(), reason, details });
    if (err) setError(err);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-black text-gray-900 text-base">New Report</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              <AlertCircle size={12} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {allowedTypes.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                Target Type
              </label>
              <select
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value);
                  setReason("");
                }}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 bg-gray-50 cursor-pointer appearance-none capitalize"
              >
                {allowedTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
              Target ID *
            </label>
            <input
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="MongoDB ObjectId of the target"
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 bg-gray-50 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
              Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 bg-gray-50 cursor-pointer appearance-none"
            >
              <option value="">Select a reason</option>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
              Details (optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              placeholder="Any context that helps another admin review this..."
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 bg-gray-50 resize-none placeholder:text-gray-400"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm rounded-xl transition disabled:opacity-60 shadow-sm shadow-primary-500/20"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Report
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ReportCard({ flag, onResolve, onDelete }) {
  const [expanding, setExpanding] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const targetLink = TARGET_LINKS[flag.targetType]?.(flag.targetId);

  const handleResolve = async (status) => {
    setLoading(true);
    await onResolve(flag._id, status, note);
    setLoading(false);
    setExpanding(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(flag._id);
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <div
      className={`bg-white rounded-2xl border p-5 transition-shadow hover:shadow-sm ${
        flag.status === "pending"
          ? "border-amber-200 border-l-4 border-l-amber-400"
          : "border-gray-100"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">
              {flag.targetType}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[flag.status]}`}
            >
              {flag.status}
            </span>
            {flag.reporterRole === "superadmin" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-primary-50 text-primary-700 border-primary-200">
                Admin-filed
              </span>
            )}
          </div>
          <p className="font-bold text-gray-900 text-sm">
            {REASON_LABELS[flag.reason] || flag.reason}
          </p>
          {flag.details && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
              {flag.details}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end">
            <Clock size={9} />
            {new Date(flag.createdAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 capitalize">
            {flag.reporterRole}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {targetLink && (
            <Link
              href={targetLink}
              target="_blank"
              className="flex items-center gap-1 text-xs text-primary-600 font-semibold hover:underline"
            >
              <ExternalLink size={11} /> View {flag.targetType}
            </Link>
          )}
          <span className="text-[10px] text-gray-400">
            ID: {flag.targetId?.toString().slice(-8)}
          </span>
        </div>
        <button
          onClick={() => setConfirmDelete(true)}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          title="Delete report"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {flag.adminNote && (
        <div className="mt-3 px-3 py-2 bg-gray-50 rounded-xl text-xs text-gray-600 border border-gray-100">
          <span className="font-semibold text-gray-700">Admin note:</span>{" "}
          {flag.adminNote}
        </div>
      )}

      {flag.status === "pending" && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {!expanding ? (
            <div className="flex gap-2">
              <button
                onClick={() => setExpanding(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary-50 text-primary-700 font-semibold text-xs rounded-xl hover:bg-primary-100 transition"
              >
                <Eye size={12} /> Resolve
              </button>
              <button
                onClick={() => handleResolve("dismissed")}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 font-semibold text-xs rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <XCircle size={12} />
                )}
                Dismiss
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional admin note (e.g. action taken, reason for dismissal)..."
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 bg-gray-50 resize-none"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleResolve("actioned")}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-lime-600 hover:bg-lime-700 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={12} />
                  )}
                  Mark Actioned
                </button>
                <button
                  onClick={() => handleResolve("reviewed")}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
                >
                  <Eye size={12} /> Mark Reviewed
                </button>
                <button
                  onClick={() => handleResolve("dismissed")}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 font-semibold text-xs rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <XCircle size={12} /> Dismiss
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
      )}

      <AnimatePresence>
        {confirmDelete && (
          <DeleteDialog
            onConfirm={handleDelete}
            onClose={() => setConfirmDelete(false)}
            deleting={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * ReportsQueue — shared full-CRUD report queue, scoped to a subset of
 * Flag.targetType via `allowedTypes`. Used by both the "Reported Users" and
 * "Reported Jobs" admin pages so they stay pixel-identical and share one
 * implementation of create/read/update/delete against /api/flags.
 */
export default function ReportsQueue({
  title,
  icon: Icon,
  iconClassName = "text-red-500",
  allowedTypes,
  typeTabs,
  emptyLabel = "reports",
}) {
  const isAuthorized = useSuperAdminAuthRedirect();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatus] = useState("pending");
  const [typeFilter, setTypeFilter] = useState(typeTabs ? typeTabs[0].value : "all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const limit = 20;

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("superadminToken");
      const targetType =
        typeFilter === "all" ? allowedTypes.join(",") : typeFilter;
      const res = await axios.get(`${API}/api/flags`, {
        params: { status: statusFilter, targetType, page, limit },
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setFlags(res.data.flags || []);
      setTotal(res.data.total || 0);
    } catch {
      notify("Failed to load reports", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, page]);

  useEffect(() => {
    if (isAuthorized) fetchFlags();
  }, [fetchFlags, isAuthorized]);

  const handleResolve = async (id, status, adminNote) => {
    try {
      const token = localStorage.getItem("superadminToken");
      await axios.patch(
        `${API}/api/flags/${id}/resolve`,
        { status, adminNote },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true },
      );
      setFlags((prev) =>
        prev.map((f) => (f._id === id ? { ...f, status, adminNote } : f)),
      );
      notify(`Report marked as ${status}`);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to resolve report", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("superadminToken");
      await axios.delete(`${API}/api/flags/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setFlags((prev) => prev.filter((f) => f._id !== id));
      setTotal((t) => Math.max(0, t - 1));
      notify("Report deleted");
    } catch (err) {
      notify(err.response?.data?.message || "Failed to delete report", "error");
    }
  };

  const handleCreate = async ({ targetType, targetId, reason, details }) => {
    setCreating(true);
    try {
      const token = localStorage.getItem("superadminToken");
      await axios.post(
        `${API}/api/flags`,
        { targetType, targetId, reason, details },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true },
      );
      setShowCreate(false);
      notify("Report created");
      fetchFlags();
      return null;
    } catch (err) {
      return err.response?.data?.message || "Failed to create report";
    } finally {
      setCreating(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-lime-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingCount = flags.filter((f) => f.status === "pending").length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="max-w-4xl space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Icon size={22} className={iconClassName} /> {title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} report{total !== 1 ? "s" : ""}
            {statusFilter === "pending" ? ` · ${pendingCount} pending review` : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm rounded-xl transition shadow-sm shadow-primary-500/20"
        >
          <Plus size={15} /> New Report
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition capitalize ${
              statusFilter === s
                ? "bg-primary-500 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {s}{" "}
            {s === "pending" && statusFilter === "pending" && pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[9px]">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Type filter (only when this queue spans more than one target type) */}
      {typeTabs && (
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-gray-400" />
          <div className="flex gap-2 flex-wrap">
            {typeTabs.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTypeFilter(t.value);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                  typeFilter === t.value
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reports list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Sk key={i} className="h-40" />
          ))}
        </div>
      ) : flags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <Icon size={24} className="text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-800 mb-1">No {emptyLabel}</h3>
          <p className="text-sm text-gray-400">
            {statusFilter === "pending"
              ? `No pending ${emptyLabel} to review.`
              : `No ${statusFilter} ${emptyLabel}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => (
            <ReportCard
              key={flag._id}
              flag={flag}
              onResolve={handleResolve}
              onDelete={handleDelete}
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

      <AnimatePresence>
        {showCreate && (
          <CreateReportModal
            allowedTypes={allowedTypes}
            onClose={() => setShowCreate(false)}
            onCreate={handleCreate}
            creating={creating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
