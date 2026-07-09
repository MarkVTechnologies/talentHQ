"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSuperAdminAuthRedirect } from "@/app/utils/superAdminAuthRedirect";
import {
  Settings as SettingsIcon,
  UserCog,
  KeyRound,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Crown,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE;

const INP =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400 bg-gray-50 focus:bg-white transition placeholder:text-gray-400";
const LBL = "block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide";

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

function Card({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-primary-600" />
        </div>
        <div>
          <h2 className="font-black text-gray-900 text-sm leading-none">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function DeleteDialog({ admin, onConfirm, onClose, deleting }) {
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
        <h3 className="font-black text-gray-900 text-base mb-1">Remove this admin?</h3>
        <p className="text-sm text-gray-500 mb-5">
          <span className="font-semibold">{admin.fullName}</span> will lose access
          immediately. This cannot be undone.
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
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Remove
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AdminModal({ mode, form, setForm, onSave, onClose, saving }) {
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

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
          <h2 className="font-black text-gray-900 text-base">
            {mode === "create" ? "Add Admin" : "Edit Admin"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className={LBL}>Full Name</label>
            <input
              value={form.fullName || ""}
              onChange={(e) => set("fullName", e.target.value)}
              className={INP}
            />
          </div>
          <div>
            <label className={LBL}>Email</label>
            <input
              type="email"
              value={form.email || ""}
              onChange={(e) => set("email", e.target.value)}
              className={INP}
            />
          </div>
          {mode === "create" && (
            <div>
              <label className={LBL}>Password</label>
              <input
                type="password"
                value={form.password || ""}
                onChange={(e) => set("password", e.target.value)}
                placeholder="At least 8 characters"
                className={INP}
              />
            </div>
          )}
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
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminSettingsPage() {
  const isAuthorized = useSuperAdminAuthRedirect();
  const router = useRouter();
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("superadminToken")}`,
  });

  // ── My profile ───────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({ fullName: "", email: "" });
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await axios.get(`${API}/api/superadmin/me`, {
        headers: authHeaders(),
        withCredentials: true,
      });
      setProfile(res.data.admin);
    } catch {
      notify("Failed to load your profile", "error");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const handleSaveProfile = async () => {
    if (!profile.fullName?.trim() || !profile.email?.trim()) {
      notify("Name and email are required", "error");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await axios.patch(
        `${API}/api/superadmin/me`,
        { fullName: profile.fullName.trim(), email: profile.email.trim() },
        { headers: authHeaders(), withCredentials: true },
      );
      setProfile(res.data.admin);
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, ...res.data.admin }));
      notify("Profile updated");
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ─────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPw, setChangingPw] = useState(false);

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      notify("Fill in both password fields", "error");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      notify("New passwords don't match", "error");
      return;
    }
    setChangingPw(true);
    try {
      await axios.patch(
        `${API}/api/superadmin/me/password`,
        { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword },
        { headers: authHeaders(), withCredentials: true },
      );
      notify("Password changed — please log in again");
      localStorage.clear();
      setTimeout(() => router.push("/admin/login"), 1200);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to change password", "error");
    } finally {
      setChangingPw(false);
    }
  };

  // ── Admin accounts (full CRUD) ───────────────────────────────────────────────
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null); // null | "create" | "edit"
  const [editTarget, setEditTarget] = useState(null);
  const [adminForm, setAdminForm] = useState({});
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selfId, setSelfId] = useState(null);

  const fetchAdmins = useCallback(async () => {
    setAdminsLoading(true);
    try {
      const res = await axios.get(`${API}/api/superadmin/admins`, {
        headers: authHeaders(),
        withCredentials: true,
      });
      setAdmins(res.data.admins || []);
    } catch {
      notify("Failed to load admin accounts", "error");
    } finally {
      setAdminsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchProfile();
    fetchAdmins();
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      setSelfId(stored.id || null);
    } catch {
      setSelfId(null);
    }
  }, [isAuthorized, fetchProfile, fetchAdmins]);

  const openCreate = () => {
    setAdminForm({ fullName: "", email: "", password: "" });
    setEditTarget(null);
    setModalMode("create");
  };

  const openEdit = (admin) => {
    setAdminForm({ fullName: admin.fullName, email: admin.email });
    setEditTarget(admin);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditTarget(null);
    setAdminForm({});
  };

  const handleSaveAdmin = async () => {
    if (!adminForm.fullName?.trim() || !adminForm.email?.trim()) {
      notify("Name and email are required", "error");
      return;
    }
    if (modalMode === "create" && (!adminForm.password || adminForm.password.length < 8)) {
      notify("Password must be at least 8 characters", "error");
      return;
    }
    setSavingAdmin(true);
    try {
      if (modalMode === "create") {
        await axios.post(
          `${API}/api/superadmin/admins`,
          {
            fullName: adminForm.fullName.trim(),
            email: adminForm.email.trim(),
            password: adminForm.password,
          },
          { headers: authHeaders(), withCredentials: true },
        );
        notify("Admin created");
      } else {
        await axios.patch(
          `${API}/api/superadmin/admins/${editTarget._id}`,
          { fullName: adminForm.fullName.trim(), email: adminForm.email.trim() },
          { headers: authHeaders(), withCredentials: true },
        );
        notify("Admin updated");
      }
      closeModal();
      fetchAdmins();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to save admin", "error");
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleDeleteAdmin = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/api/superadmin/admins/${deleteTarget._id}`, {
        headers: authHeaders(),
        withCredentials: true,
      });
      setDeleteTarget(null);
      notify("Admin removed");
      fetchAdmins();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to remove admin", "error");
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
    <div className="max-w-3xl space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} />}

      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <SettingsIcon size={22} className="text-primary-500" /> Settings
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your profile, password and other admin accounts
        </p>
      </div>

      {/* My profile */}
      <Card icon={UserCog} title="My Profile" subtitle="Your name and email on this admin account">
        {profileLoading ? (
          <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LBL}>Full Name</label>
                <input
                  value={profile.fullName || ""}
                  onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                  className={INP}
                />
              </div>
              <div>
                <label className={LBL}>Email</label>
                <input
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  className={INP}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm rounded-xl transition disabled:opacity-60 shadow-sm shadow-primary-500/20"
              >
                {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Save Changes
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Change password */}
      <Card icon={KeyRound} title="Change Password" subtitle="You'll need to log in again afterwards">
        <div className="space-y-4">
          <div>
            <label className={LBL}>Current Password</label>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
              className={INP}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>New Password</label>
              <input
                type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                placeholder="At least 8 characters"
                className={INP}
              />
            </div>
            <div>
              <label className={LBL}>Confirm New Password</label>
              <input
                type="password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                className={INP}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleChangePassword}
              disabled={changingPw}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm rounded-xl transition disabled:opacity-60 shadow-sm shadow-primary-500/20"
            >
              {changingPw ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              Change Password
            </button>
          </div>
        </div>
      </Card>

      {/* Admin accounts — full CRUD */}
      <Card
        icon={ShieldCheck}
        title="Admin Accounts"
        subtitle={`${admins.length} admin${admins.length !== 1 ? "s" : ""} with super admin access`}
      >
        <div className="flex justify-end mb-4">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm rounded-xl transition shadow-sm shadow-primary-500/20"
          >
            <Plus size={15} /> Add Admin
          </button>
        </div>

        {adminsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {admins.map((admin) => {
              const isSelf = admin._id === selfId;
              return (
                <div key={admin._id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck size={15} className="text-primary-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5 truncate">
                        {admin.fullName}
                        {isSelf && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-lime-50 text-lime-700 border border-lime-200 text-[9px] font-bold">
                            <Crown size={9} /> You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEdit(admin)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(admin)}
                      disabled={isSelf || admins.length <= 1}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                      title={isSelf ? "You can't remove your own account here" : "Remove"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <AnimatePresence>
        {modalMode && (
          <AdminModal
            mode={modalMode}
            form={adminForm}
            setForm={setAdminForm}
            onSave={handleSaveAdmin}
            onClose={closeModal}
            saving={savingAdmin}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteDialog
            admin={deleteTarget}
            onConfirm={handleDeleteAdmin}
            onClose={() => setDeleteTarget(null)}
            deleting={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
