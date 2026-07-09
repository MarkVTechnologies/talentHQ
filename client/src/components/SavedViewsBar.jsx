"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Bookmark, Plus, X, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE;

/**
 * SavedViewsBar — full CRUD widget for pinned analytics views (name + range),
 * shared by the User and Job analytics pages so "save current view" behaves
 * identically everywhere it appears.
 */
export default function SavedViewsBar({ page, range, onApply, notify }) {
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("superadminToken")}`,
  });

  const fetchViews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/superadmin/analytics/views`, {
        params: { page },
        headers: authHeaders(),
        withCredentials: true,
      });
      setViews(res.data.views || []);
    } catch {
      // Non-critical widget — fail quietly rather than blocking the charts.
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await axios.post(
        `${API}/api/superadmin/analytics/views`,
        { name: name.trim(), page, range },
        { headers: authHeaders(), withCredentials: true },
      );
      setName("");
      setShowSave(false);
      notify?.("View saved");
      fetchViews();
    } catch (err) {
      notify?.(err.response?.data?.message || "Failed to save view", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await axios.delete(`${API}/api/superadmin/analytics/views/${id}`, {
        headers: authHeaders(),
        withCredentials: true,
      });
      setViews((prev) => prev.filter((v) => v._id !== id));
      notify?.("View deleted");
    } catch (err) {
      notify?.(err.response?.data?.message || "Failed to delete view", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest">
        <Bookmark size={12} /> Saved views
      </span>

      {loading ? (
        <span className="text-xs text-gray-400">Loading…</span>
      ) : views.length === 0 && !showSave ? (
        <span className="text-xs text-gray-400">None yet</span>
      ) : (
        views.map((v) => (
          <span
            key={v._id}
            className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-600"
          >
            <button
              onClick={() => onApply(v.range)}
              className="hover:text-primary-600 transition"
              title={`Apply ${v.range} range`}
            >
              {v.name} <span className="text-gray-400 font-normal">({v.range})</span>
            </button>
            <button
              onClick={() => handleDelete(v._id)}
              disabled={deletingId === v._id}
              className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition disabled:opacity-40"
              title="Delete saved view"
            >
              {deletingId === v._id ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <X size={10} />
              )}
            </button>
          </span>
        ))
      )}

      {showSave ? (
        <div className="inline-flex items-center gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="View name…"
            maxLength={100}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white w-32"
          />
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="p-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-50"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          </button>
          <button
            onClick={() => {
              setShowSave(false);
              setName("");
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition"
          >
            <X size={11} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSave(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-primary-600 hover:bg-primary-50 transition"
        >
          <Plus size={11} /> Save current view
        </button>
      )}
    </div>
  );
}
