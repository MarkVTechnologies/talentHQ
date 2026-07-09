"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useSuperAdminAuthRedirect } from "@/app/utils/superAdminAuthRedirect";
import {
  Megaphone,
  Search,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  Plus,
  RefreshCw,
  Power,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE;

const INP =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400 bg-gray-50 focus:bg-white transition placeholder:text-gray-400";
const LBL =
  "block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide";

const AUDIENCES = ["all", "employer", "handyman", "jobseeker"];
const PRIORITIES = ["info", "success", "warning", "critical"];

const PRIORITY_STYLES = {
  info: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-lime-50 text-lime-700 border-lime-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

const PRIORITY_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: ShieldAlert,
};

const EMPTY_FORM = {
  title: "",
  body: "",
  audience: "all",
  priority: "info",
  isActive: true,
  startsAt: "",
  expiresAt: "",
};

function toDateInput(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
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

function PriorityBadge({ priority }) {
  const Icon = PRIORITY_ICONS[priority] || Info;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.info}`}
    >
      <Icon size={10} />
      {priority}
    </span>
  );
}

function ActiveBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
        active
          ? "bg-lime-50 text-lime-700 border border-lime-200"
          : "bg-gray-100 text-gray-500 border border-gray-200"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function DeleteDialog({ announcement, onConfirm, onClose, deleting }) {
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
          Delete announcement?
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          <span className="font-semibold">{announcement.title}</span> will be
          permanently deleted. This cannot be undone.
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

function AnnouncementModal({ mode, form, setForm, onSave, onClose, saving }) {
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-start justify-center p-4 py-10">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                <Megaphone size={16} className="text-primary-600" />
              </div>
              <h2 className="font-black text-gray-900 text-base leading-none">
                {mode === "create" ? "New Announcement" : "Edit Announcement"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className={LBL}>Title *</label>
              <input
                value={form.title || ""}
                onChange={(e) => set("title", e.target.value)}
                maxLength={150}
                placeholder="e.g. Scheduled maintenance this weekend"
                className={INP}
              />
            </div>

            <div>
              <label className={LBL}>Message *</label>
              <textarea
                rows={4}
                value={form.body || ""}
                onChange={(e) => set("body", e.target.value)}
                maxLength={2000}
                placeholder="Full announcement text shown to the audience..."
                className={`${INP} resize-none`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LBL}>Audience</label>
                <select
                  value={form.audience || "all"}
                  onChange={(e) => set("audience", e.target.value)}
                  className={`${INP} cursor-pointer appearance-none capitalize`}
                >
                  {AUDIENCES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LBL}>Priority</label>
                <select
                  value={form.priority || "info"}
                  onChange={(e) => set("priority", e.target.value)}
                  className={`${INP} cursor-pointer appearance-none capitalize`}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LBL}>Starts (optional)</label>
                <input
                  type="date"
                  value={form.startsAt || ""}
                  onChange={(e) => set("startsAt", e.target.value)}
                  className={INP}
                />
              </div>
              <div>
                <label className={LBL}>Expires (optional)</label>
                <input
                  type="date"
                  value={form.expiresAt || ""}
                  onChange={(e) => set("expiresAt", e.target.value)}
                  className={INP}
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-lime-500"
              />
              <span className="text-sm text-gray-700 font-semibold">
                Active (visible to its audience)
              </span>
            </label>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm rounded-xl transition disabled:opacity-60 shadow-sm shadow-primary-500/20"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {mode === "create" ? "Create" : "Save Changes"}
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function AnnouncementsPage() {
  const isAuthorized = useSuperAdminAuthRedirect();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);

  const [modalMode, setModalMode] = useState(null); // null | "create" | "edit"
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("superadminToken");
      const res = await axios.get(`${API}/api/superadmin/announcements`, {
        params: { status: statusFilter, search: debouncedSearch, page, limit: 20 },
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setAnnouncements(res.data.announcements || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      notify("Failed to load announcements", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, page]);

  useEffect(() => {
    if (isAuthorized) fetchAnnouncements();
  }, [fetchAnnouncements, isAuthorized]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setModalMode("create");
  };

  const openEdit = (announcement) => {
    setForm({
      ...announcement,
      startsAt: toDateInput(announcement.startsAt),
      expiresAt: toDateInput(announcement.expiresAt),
    });
    setEditTarget(announcement);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditTarget(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.title?.trim() || !form.body?.trim()) {
      notify("Title and message are required", "error");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("superadminToken");
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        audience: form.audience,
        priority: form.priority,
        isActive: form.isActive,
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
      };

      if (modalMode === "create") {
        await axios.post(`${API}/api/superadmin/announcements`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        notify("Announcement created");
      } else {
        await axios.patch(
          `${API}/api/superadmin/announcements/${editTarget._id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` }, withCredentials: true },
        );
        notify("Announcement updated");
      }
      closeModal();
      fetchAnnouncements();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to save announcement", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (announcement) => {
    setTogglingId(announcement._id);
    try {
      const token = localStorage.getItem("superadminToken");
      await axios.patch(
        `${API}/api/superadmin/announcements/${announcement._id}`,
        { isActive: !announcement.isActive },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true },
      );
      setAnnouncements((prev) =>
        prev.map((a) =>
          a._id === announcement._id ? { ...a, isActive: !a.isActive } : a,
        ),
      );
      notify(`Announcement ${announcement.isActive ? "deactivated" : "activated"}`);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update announcement", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("superadminToken");
      await axios.delete(`${API}/api/superadmin/announcements/${deleteTarget._id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setDeleteTarget(null);
      notify("Announcement deleted");
      fetchAnnouncements();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to delete announcement", "error");
    } finally {
      setDeleting(false);
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
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Megaphone size={22} className="text-primary-500" /> Announcements
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} announcement{total !== 1 ? "s" : ""} created
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm rounded-xl transition shadow-sm shadow-primary-500/20"
        >
          <Plus size={15} /> New Announcement
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "active", "inactive"].map((s) => (
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
            {s}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white placeholder:text-gray-400 transition"
          />
        </div>
        <button
          onClick={fetchAnnouncements}
          className="p-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <Megaphone size={24} className="text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-800 mb-1">No announcements</h3>
          <p className="text-sm text-gray-400">
            {debouncedSearch
              ? `No results for "${debouncedSearch}"`
              : "Create your first announcement to broadcast a message."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div
              key={a._id}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <p className="font-black text-gray-900 text-sm truncate">
                      {a.title}
                    </p>
                    <PriorityBadge priority={a.priority} />
                    <ActiveBadge active={a.isActive} />
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">
                      {a.audience}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {a.body}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-gray-400">
                    <span>
                      Created{" "}
                      {new Date(a.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {a.startsAt && (
                      <span>
                        Starts {new Date(a.startsAt).toLocaleDateString("en-NG")}
                      </span>
                    )}
                    {a.expiresAt && (
                      <span>
                        Expires {new Date(a.expiresAt).toLocaleDateString("en-NG")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(a)}
                    disabled={togglingId === a._id}
                    className={`p-1.5 rounded-lg transition disabled:opacity-40 ${
                      a.isActive
                        ? "text-lime-600 hover:bg-lime-50"
                        : "text-gray-400 hover:bg-gray-100"
                    }`}
                    title={a.isActive ? "Deactivate" : "Activate"}
                  >
                    {togglingId === a._id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Power size={14} />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(a)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(a)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
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

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modalMode && (
          <AnnouncementModal
            mode={modalMode}
            form={form}
            setForm={setForm}
            onSave={handleSave}
            onClose={closeModal}
            saving={saving}
          />
        )}
      </AnimatePresence>

      {/* Delete Dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteDialog
            announcement={deleteTarget}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
            deleting={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
