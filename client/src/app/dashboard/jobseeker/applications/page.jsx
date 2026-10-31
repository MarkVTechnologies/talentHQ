"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Trash2,
  Plus,
  X,
  ChevronDown,
  Loader2,
  MapPin,
  FileText,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  XCircle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE;

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLE_TYPES = [
  "full-time role",
  "part-time role",
  "contract",
  "internship",
  "remote",
];

const STATUS_MAP = {
  pending: {
    label: "Pending",
    cls: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  reviewed: {
    label: "Reviewing",
    cls: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  accepted: {
    label: "Accepted",
    cls: "bg-lime-50 text-lime-700 border border-lime-200",
  },
  rejected: {
    label: "Rejected",
    cls: "bg-red-50 text-red-600 border border-red-200",
  },
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2 flex-1">
          <div className="h-5 w-48 bg-gray-200 rounded" />
          <div className="h-3.5 w-28 bg-gray-100 rounded" />
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-3 w-3/4 bg-gray-100 rounded" />
      </div>
      <div className="flex gap-2 mt-4">
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
        <div className="h-5 w-20 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ── Confirm delete dialog ─────────────────────────────────────────────────────
function DeleteDialog({ app, onConfirm, onCancel, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h3 className="font-bold text-gray-900 mb-2">Delete application?</h3>
        <p className="text-sm text-gray-500 mb-6">
          This will permanently remove your application for{" "}
          <strong>{app.roleTitle}</strong>. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Trash2 size={15} />
            )}
            {loading ? "Deleting…" : "Delete"}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Application form ──────────────────────────────────────────────────────────
function ApplicationForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({
    roleTitle: "",
    roleType: "",
    preferredLocation: "",
    coverLetter: "",
    portfolioLinks: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inp =
    "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 bg-gray-50 focus:bg-white transition";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.roleTitle.trim()) {
      setError("Role title is required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await axios.post(`${API}/api/profile/me/applications`, form, {
        withCredentials: true,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-black text-gray-900 text-lg">
              Apply for a Role
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              This goes into your applications tracker
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            <AlertCircle size={15} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Role Title *
            </label>
            <div className="relative">
              <Briefcase
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                placeholder="e.g. Frontend Developer"
                value={form.roleTitle}
                onChange={(e) =>
                  setForm((p) => ({ ...p, roleTitle: e.target.value }))
                }
                className={`${inp} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Role Type
            </label>
            <div className="relative">
              <select
                value={form.roleType}
                onChange={(e) =>
                  setForm((p) => ({ ...p, roleType: e.target.value }))
                }
                className={`${inp} appearance-none pr-9 cursor-pointer`}
              >
                <option value="">Select type…</option>
                {ROLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Preferred Location
            </label>
            <div className="relative">
              <MapPin
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                placeholder="e.g. Lagos, Remote"
                value={form.preferredLocation}
                onChange={(e) =>
                  setForm((p) => ({ ...p, preferredLocation: e.target.value }))
                }
                className={`${inp} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Cover Letter / Motivation
            </label>
            <textarea
              rows={4}
              placeholder="Tell employers why you're a great fit…"
              value={form.coverLetter}
              onChange={(e) =>
                setForm((p) => ({ ...p, coverLetter: e.target.value }))
              }
              className={`${inp} resize-none`}
              maxLength={2000}
            />
            <p className="text-right text-xs text-gray-400 mt-1">
              {form.coverLetter.length}/2000
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Portfolio Links
            </label>
            <div className="relative">
              <LinkIcon
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                placeholder="https://github.com/you, https://portfolio.com (comma separated)"
                value={form.portfolioLinks}
                onChange={(e) =>
                  setForm((p) => ({ ...p, portfolioLinks: e.target.value }))
                }
                className={`${inp} pl-9`}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Submitting…
                </>
              ) : (
                <>Submit Application</>
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Application card ──────────────────────────────────────────────────────────
function AppCard({ app, onDelete }) {
  const links = app.portfolioLinks
    ? typeof app.portfolioLinks === "string"
      ? app.portfolioLinks
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean)
      : app.portfolioLinks
    : [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3 flex-wrap">
            <h3 className="font-bold text-gray-900">{app.roleTitle}</h3>
            <StatusBadge status={app.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
            {app.roleType && (
              <span className="flex items-center gap-1">
                <Briefcase size={11} />
                {app.roleType}
              </span>
            )}
            {app.preferredLocation && (
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {app.preferredLocation}
              </span>
            )}
            <span className="flex items-center gap-1">
              <FileText size={11} />
              {new Date(app.createdAt).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(app)}
          className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {app.coverLetter && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3">
          {app.coverLetter}
        </p>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((link, i) => (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-lime-700 hover:underline flex items-center gap-1 px-2 py-1 bg-lime-50 rounded-lg"
            >
              <LinkIcon size={11} />
              {link.replace(/^https?:\/\//, "").slice(0, 30)}…
            </a>
          ))}
        </div>
      )}

      {/* Employer response message */}
      {app.employerMessage && (
        <div
          className={`mt-3 pt-3 border-t flex items-start gap-2.5 p-3 rounded-xl ${
            app.status === "accepted"
              ? "bg-lime-50 border-lime-200"
              : app.status === "rejected"
                ? "bg-red-50 border-red-200"
                : "bg-blue-50 border-blue-200"
          }`}
        >
          <div
            className={`flex-shrink-0 mt-0.5 ${
              app.status === "accepted"
                ? "text-lime-600"
                : app.status === "rejected"
                  ? "text-red-500"
                  : "text-blue-600"
            }`}
          >
            {app.status === "accepted" ? (
              <CheckCircle2 size={14} />
            ) : app.status === "rejected" ? (
              <XCircle size={14} />
            ) : (
              <MessageSquare size={14} />
            )}
          </div>
          <div>
            <p
              className={`text-[11px] font-bold uppercase tracking-wide mb-0.5 ${
                app.status === "accepted"
                  ? "text-lime-700"
                  : app.status === "rejected"
                    ? "text-red-600"
                    : "text-blue-700"
              }`}
            >
              Message from employer
            </p>
            <p className="text-xs text-gray-700 leading-relaxed">
              {app.employerMessage}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchApplications = async () => {
    try {
      setFetching(true);
      const res = await axios.get(`${API}/api/profile/me/applications`, {
        withCredentials: true,
      });
      setApplications(res.data || []);
    } catch {
      notify("Failed to load applications", "error");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    // Reminder emails link here with ?new=1 to open the form straight away
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      setShowForm(true);
    }
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(
        `${API}/api/profile/me/applications/${deleteTarget._id}`,
        { withCredentials: true },
      );
      setApplications((prev) => prev.filter((a) => a._id !== deleteTarget._id));
      notify("Application deleted");
      setDeleteTarget(null);
    } catch {
      notify("Failed to delete application", "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered =
    filter === "all"
      ? applications
      : applications.filter((a) => a.status === filter);
  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    reviewed: applications.filter((a) => a.status === "reviewed").length,
    accepted: applications.filter((a) => a.status === "accepted").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${
              toast.type === "error"
                ? "bg-red-600 text-white"
                : "bg-lime-600 text-white"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle size={15} />
            ) : (
              <CheckCircle2 size={15} />
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">My Applications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track all your job applications in one place
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl text-sm transition-colors"
        >
          <Plus size={16} /> Apply for a Role
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "reviewed", "accepted", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === s
                ? "bg-primary-500 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Content */}
      {fetching ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Briefcase size={28} className="text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-800 mb-2">
            {filter === "all"
              ? "No applications yet"
              : `No ${filter} applications`}
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            {filter === "all"
              ? "Submit your first application to start tracking your job search."
              : `None of your applications have a "${filter}" status yet.`}
          </p>
          {filter === "all" && (
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 bg-primary-500 text-white font-bold rounded-xl text-sm hover:bg-primary-600 transition"
            >
              Apply for a role
            </button>
          )}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map((app) => (
              <AppCard key={app._id} app={app} onDelete={setDeleteTarget} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Application form modal */}
      <AnimatePresence>
        {showForm && (
          <ApplicationForm
            onSuccess={() => {
              setShowForm(false);
              fetchApplications();
              notify("Application submitted!");
            }}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteDialog
            app={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
