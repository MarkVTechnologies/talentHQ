"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import axios from "axios";
import { resumeDownloadUrl } from "@/lib/utils";
import {
  Edit2,
  Plus,
  Trash2,
  Upload,
  X,
  Loader2,
  Eye,
  EyeOff,
  MapPin,
  Mail,
  Phone,
  Linkedin,
  Github,
  FileText,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  Code2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE;

// ── Profile completion ────────────────────────────────────────────────────────
function computeCompletion(p) {
  if (!p) return 0;
  const checks = [
    p.fullName,
    p.headline,
    p.tagline,
    p.phone,
    p.location?.city || (typeof p.location === "string" && p.location),
    p.linkedin,
    p.avatar,
    p.resume,
    p.skills?.length > 0,
    p.workExperience?.length > 0,
    p.education?.length > 0,
    p.projects?.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  return (
    <div
      className={`fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold animate-fade-in ${
        type === "error" ? "bg-red-600 text-white" : "bg-lime-600 text-white"
      }`}
    >
      {type === "error" ? (
        <AlertCircle size={15} />
      ) : (
        <CheckCircle2 size={15} />
      )}
      {message}
    </div>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, onSave, loading, children }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X size={18} />
          </button>
        </div>
        {children}
        <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
          <button
            onClick={onSave}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Input helpers ─────────────────────────────────────────────────────────────
const INP =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 bg-gray-50 focus:bg-white transition";
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, onAdd, children, empty }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
          {Icon && <Icon size={15} className="text-lime-600" />}
          {title}
        </h2>
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 text-xs font-semibold text-lime-700 hover:text-lime-800 px-2.5 py-1.5 rounded-lg hover:bg-lime-50 transition"
          >
            <Plus size={13} /> Add
          </button>
        )}
      </div>
      {children || (
        <p className="text-sm text-gray-400 italic">
          {empty || "Nothing added yet."}
        </p>
      )}
    </div>
  );
}

// ── Delete row button ─────────────────────────────────────────────────────────
function DelBtn({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Trash2 size={14} />
      )}
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ProfileSkeleton() {
  const Sk = ({ className }) => (
    <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />
  );
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-2xl border p-6 flex gap-5">
        <Sk className="w-24 h-24 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Sk className="h-6 w-48" />
          <Sk className="h-4 w-64" />
          <Sk className="h-3 w-32" />
          <Sk className="h-3 w-full" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <Sk key={i} className="h-32 w-full" />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function JobseekerProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null); // { type, data? }
  const [form, setForm] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [resumePublic, setResumePublic] = useState(true);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refresh = async () => {
    const res = await axios.get(`${API}/api/profile/me`, {
      withCredentials: true,
    });
    setProfile(res.data);
    setResumePublic(res.data.resumePublic !== false);
  };

  useEffect(() => {
    refresh()
      .catch(() => notify("Failed to load profile", "error"))
      .finally(() => setLoading(false));
  }, []);

  const openModal = (type, data = {}) => {
    setModal(type);
    setForm(data);
  };
  const closeModal = () => {
    setModal(null);
    setForm({});
  };

  const fc = form;
  const set = (name, value) => setForm((p) => ({ ...p, [name]: value }));
  const handleFile = (e, name) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (name === "resume") {
      set(name, file);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => set(name, reader.result);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (modal === "work" && (!fc.jobTitle?.trim() || !fc.company?.trim() || !fc.startDate)) {
      notify("Job title, company and start date are required", "error");
      return;
    }

    setSaving(true);
    try {
      let url,
        method = "post",
        data = fc,
        headers = {};

      if (modal === "summary") {
        url = `${API}/api/profile/me`;
        method = "put";
        // location: flatten to string for backend
        if (fc.locationArea || fc.locationCity || fc.locationCountry) {
          data = {
            ...fc,
            location: {
              area: fc.locationArea,
              city: fc.locationCity,
              country: fc.locationCountry,
            },
          };
        }
      } else if (modal === "resume") {
        url = `${API}/api/profile/me/resume`;
        method = "put";
        const fd = new FormData();
        fd.append("resume", fc.resume);
        data = fd;
        headers = { "Content-Type": "multipart/form-data" };
      } else if (modal === "skill") {
        url = `${API}/api/profile/me/skills`;
      } else if (modal === "work") {
        url = `${API}/api/profile/me/work-experiences`;
      } else if (modal === "education") {
        url = `${API}/api/profile/me/education`;
      } else if (modal === "project") {
        url = `${API}/api/profile/me/projects`;
      } else if (modal === "certification") {
        url = `${API}/api/profile/me/certifications`;
      }

      await axios({ url, method, data, headers, withCredentials: true });
      await refresh();
      notify("Saved successfully");
      closeModal();
    } catch (err) {
      notify(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Save failed",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const del = async (section, id) => {
    setDeletingId(id);
    const urls = {
      skill: `${API}/api/profile/me/skills/${id}`,
      work: `${API}/api/profile/me/work-experiences/${id}`,
      education: `${API}/api/profile/me/education/${id}`,
      project: `${API}/api/profile/me/project/${id}`,
      certification: `${API}/api/profile/me/certifications/${id}`,
    };
    try {
      await axios.delete(urls[section], { withCredentials: true });
      await refresh();
      notify("Deleted");
    } catch {
      notify("Delete failed", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleResumeVisibility = async () => {
    const next = !resumePublic;
    setResumePublic(next);
    try {
      await axios.put(
        `${API}/api/profile/me`,
        { resumePublic: next },
        { withCredentials: true },
      );
      notify(next ? "Resume is now public" : "Resume hidden from employers");
    } catch {
      setResumePublic(!next);
      notify("Failed to update visibility", "error");
    }
  };

  if (loading) return <ProfileSkeleton />;
  if (!profile)
    return <p className="text-gray-500 p-8">Failed to load profile.</p>;

  const completion = computeCompletion(profile);
  const locationStr =
    typeof profile.location === "object"
      ? [
          profile.location?.area,
          profile.location?.city,
          profile.location?.country,
        ]
          .filter(Boolean)
          .join(", ")
      : profile.location || "";

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && <Toast message={toast.msg} type={toast.type} />}

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.fullName}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-lime-100"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-primary-500 flex items-center justify-center text-white font-black text-2xl">
                {profile.fullName?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3 mb-2">
              <h1 className="text-2xl font-black text-gray-900">
                {profile.fullName}
              </h1>
              <button
                onClick={() => {
                  const loc =
                    typeof profile.location === "object"
                      ? profile.location
                      : {};
                  openModal("summary", {
                    ...profile,
                    locationArea: loc.area || "",
                    locationCity: loc.city || "",
                    locationCountry: loc.country || "Nigeria",
                  });
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-lime-700 px-2.5 py-1 rounded-lg border border-gray-200 hover:border-lime-300 transition"
              >
                <Edit2 size={12} /> Edit
              </button>
            </div>
            {profile.headline && (
              <p className="text-gray-700 font-medium mb-0.5">
                {profile.headline}
              </p>
            )}
            {profile.tagline && (
              <p className="text-sm text-gray-500 italic mb-3">
                {profile.tagline}
              </p>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-500">
              {profile.email && (
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-gray-400" />
                  {profile.email}
                </span>
              )}
              {profile.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-gray-400" />
                  {profile.phone}
                </span>
              )}
              {locationStr && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-gray-400" />
                  {locationStr}
                </span>
              )}
              {profile.linkedin && (
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-blue-600 hover:underline"
                >
                  <Linkedin size={13} />
                  LinkedIn
                </a>
              )}
              {profile.github && (
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-gray-700 hover:underline"
                >
                  <Github size={13} />
                  GitHub
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Completion bar */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-gray-700">
              Profile Completion
            </span>
            <span
              className={`font-bold ${completion >= 80 ? "text-lime-700" : completion >= 50 ? "text-amber-600" : "text-red-500"}`}
            >
              {completion}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-lime-500 rounded-full transition-all duration-700"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </div>

      {/* Resume */}
      <Section
        title="Resume / CV"
        icon={FileText}
        onAdd={() => openModal("resume")}
      >
        {profile.resume ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-lime-50 rounded-xl flex items-center justify-center">
                <FileText size={18} className="text-lime-600" />
              </div>
              <div>
                <a
                  href={resumeDownloadUrl(
                    profile.resume,
                    profile.fullName ? `${profile.fullName}_Resume` : "Resume",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-lime-700 hover:underline"
                >
                  View Resume
                </a>
                <a
                  href={resumeDownloadUrl(
                    profile.resume,
                    profile.fullName ? `${profile.fullName}_Resume` : "Resume",
                  )}
                  className="ml-3 text-sm font-semibold text-gray-500 hover:text-gray-800 hover:underline"
                >
                  Download
                </a>
                <p className="text-xs text-gray-400">PDF / Document</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleResumeVisibility}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition"
              >
                {resumePublic ? <Eye size={14} /> : <EyeOff size={14} />}
                {resumePublic ? "Public" : "Hidden"}
              </button>
              <button
                onClick={() => openModal("resume")}
                className="text-xs text-gray-500 hover:text-lime-700 px-2.5 py-1 border border-gray-200 rounded-lg hover:border-lime-300 transition flex items-center gap-1"
              >
                <Upload size={12} /> Replace
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
              <Upload size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mb-3">No resume uploaded yet</p>
            <button
              onClick={() => openModal("resume")}
              className="text-sm font-semibold text-lime-700 hover:text-lime-800 flex items-center gap-1"
            >
              <Plus size={14} /> Upload Resume
            </button>
          </div>
        )}
      </Section>

      {/* Skills */}
      <Section
        title="Skills"
        icon={Code2}
        onAdd={() => openModal("skill")}
        empty="Add skills to showcase your expertise"
      >
        {profile.skills?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <div
                key={s._id}
                className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-lime-50 border border-lime-100 rounded-full"
              >
                <span className="text-xs font-semibold text-lime-800">
                  {s.name}
                </span>
                {s.level && (
                  <span className="text-[10px] text-lime-600">· {s.level}</span>
                )}
                <DelBtn
                  onClick={() => del("skill", s._id)}
                  loading={deletingId === s._id}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Work Experience */}
      <Section
        title="Work Experience"
        icon={Briefcase}
        onAdd={() => openModal("work")}
        empty="Add your work history"
      >
        {profile.workExperience?.length > 0 && (
          <div className="space-y-5">
            {profile.workExperience.map((w, i) => (
              <div
                key={w._id}
                className={`flex items-start justify-between gap-4 ${i < profile.workExperience.length - 1 ? "pb-5 border-b border-gray-100" : ""}`}
              >
                <div className="flex gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Briefcase size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">
                      {w.jobTitle}
                    </p>
                    <p className="text-sm text-gray-600">{w.company}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {w.startDate?.slice(0, 7)} —{" "}
                      {w.endDate ? w.endDate.slice(0, 7) : "Present"}
                    </p>
                    {w.description && (
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        {w.description}
                      </p>
                    )}
                  </div>
                </div>
                <DelBtn
                  onClick={() => del("work", w._id)}
                  loading={deletingId === w._id}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Education */}
      <Section
        title="Education"
        icon={GraduationCap}
        onAdd={() => openModal("education")}
        empty="Add your educational background"
      >
        {profile.education?.length > 0 && (
          <div className="space-y-4">
            {profile.education.map((e, i) => (
              <div
                key={e._id}
                className={`flex items-start justify-between gap-4 ${i < profile.education.length - 1 ? "pb-4 border-b border-gray-100" : ""}`}
              >
                <div className="flex gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <GraduationCap size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">
                      {e.degree}
                    </p>
                    <p className="text-sm text-gray-600">{e.institution}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {e.graduationYear ||
                        (e.graduationDate
                          ? new Date(e.graduationDate).getFullYear()
                          : "")}
                    </p>
                  </div>
                </div>
                <DelBtn
                  onClick={() => del("education", e._id)}
                  loading={deletingId === e._id}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Projects */}
      <Section
        title="Projects & Portfolio"
        icon={Globe}
        onAdd={() => openModal("project")}
        empty="Showcase your best work"
      >
        {profile.projects?.length > 0 && (
          <div className="space-y-3">
            {profile.projects.map((p) => (
              <div
                key={p._id}
                className="flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {p.link ? (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sm text-lime-700 hover:underline flex items-center gap-1"
                      >
                        <Globe size={13} /> {p.title}
                      </a>
                    ) : (
                      <p className="font-semibold text-sm text-gray-900">
                        {p.title}
                      </p>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                </div>
                <DelBtn
                  onClick={() => del("project", p._id)}
                  loading={deletingId === p._id}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Certifications */}
      <Section
        title="Certifications"
        icon={Award}
        onAdd={() => openModal("certification")}
        empty="Add professional certifications"
      >
        {profile.certifications?.length > 0 && (
          <div className="space-y-3">
            {profile.certifications.map((c) => (
              <div
                key={c._id}
                className="flex items-start justify-between gap-4"
              >
                <div className="flex gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Award size={15} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">
                      {c.title}
                    </p>
                    {c.organization && (
                      <p className="text-xs text-gray-500">{c.organization}</p>
                    )}
                    {c.dateEarned && (
                      <p className="text-xs text-gray-400">
                        {new Date(c.dateEarned).toLocaleDateString("en-NG", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <DelBtn
                  onClick={() => del("certification", c._id)}
                  loading={deletingId === c._id}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
      {modal === "summary" && (
        <Modal
          title="Edit Profile"
          onClose={closeModal}
          onSave={save}
          loading={saving}
        >
          <div className="space-y-4">
            <Field label="Full Name">
              <input
                value={fc.fullName || ""}
                onChange={(e) => set("fullName", e.target.value)}
                className={INP}
                placeholder="Your full name"
              />
            </Field>
            <Field label="Headline">
              <input
                value={fc.headline || ""}
                onChange={(e) => set("headline", e.target.value)}
                className={INP}
                placeholder="e.g. Senior React Developer"
              />
            </Field>
            <Field label="Tagline">
              <input
                value={fc.tagline || ""}
                onChange={(e) => set("tagline", e.target.value)}
                className={INP}
                placeholder="Brief personal motto"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <input
                  value={fc.phone || ""}
                  onChange={(e) => set("phone", e.target.value)}
                  className={INP}
                  placeholder="08012345678"
                />
              </Field>
              <Field label="WhatsApp">
                <input
                  value={fc.whatsapp || ""}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  className={INP}
                  placeholder="WhatsApp number"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City">
                <input
                  value={fc.locationCity || ""}
                  onChange={(e) => set("locationCity", e.target.value)}
                  className={INP}
                  placeholder="Lagos"
                />
              </Field>
              <Field label="Area / State">
                <input
                  value={fc.locationArea || ""}
                  onChange={(e) => set("locationArea", e.target.value)}
                  className={INP}
                  placeholder="Ikeja"
                />
              </Field>
            </div>
            <Field label="LinkedIn URL">
              <input
                value={fc.linkedin || ""}
                onChange={(e) => set("linkedin", e.target.value)}
                className={INP}
                placeholder="https://linkedin.com/in/you"
              />
            </Field>
            <Field label="GitHub URL">
              <input
                value={fc.github || ""}
                onChange={(e) => set("github", e.target.value)}
                className={INP}
                placeholder="https://github.com/you"
              />
            </Field>
            <Field label="Profile Photo">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e, "avatar")}
                className={INP + " cursor-pointer"}
              />
              {fc.avatar &&
                typeof fc.avatar === "string" &&
                fc.avatar.startsWith("data:") && (
                  <img
                    src={fc.avatar}
                    alt="Preview"
                    className="mt-2 w-16 h-16 rounded-xl object-cover border"
                  />
                )}
            </Field>
          </div>
        </Modal>
      )}

      {modal === "resume" && (
        <Modal
          title="Upload Resume"
          onClose={closeModal}
          onSave={save}
          loading={saving}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Upload a PDF or Word document. Max 10MB.
            </p>
            <Field label="Resume File">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => handleFile(e, "resume")}
                className={INP + " cursor-pointer"}
              />
            </Field>
            {fc.resume && (
              <p className="text-xs text-lime-700">
                ✓ File selected: {fc.resume.name}
              </p>
            )}
          </div>
        </Modal>
      )}

      {modal === "skill" && (
        <Modal
          title="Add Skill"
          onClose={closeModal}
          onSave={save}
          loading={saving}
        >
          <div className="space-y-4">
            <Field label="Skill Name">
              <input
                value={fc.name || ""}
                onChange={(e) => set("name", e.target.value)}
                className={INP}
                placeholder="e.g. React.js"
              />
            </Field>
            <Field label="Level">
              <select
                value={fc.level || ""}
                onChange={(e) => set("level", e.target.value)}
                className={INP + " cursor-pointer"}
              >
                <option value="">Select level…</option>
                {["Beginner", "Intermediate", "Advanced", "Expert"].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Modal>
      )}

      {modal === "work" && (
        <Modal
          title="Add Work Experience"
          onClose={closeModal}
          onSave={save}
          loading={saving}
        >
          <div className="space-y-4">
            <Field label="Job Title *">
              <input
                value={fc.jobTitle || ""}
                onChange={(e) => set("jobTitle", e.target.value)}
                className={INP}
                placeholder="e.g. Frontend Developer"
              />
            </Field>
            <Field label="Company *">
              <input
                value={fc.company || ""}
                onChange={(e) => set("company", e.target.value)}
                className={INP}
                placeholder="Company name"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date *">
                <input
                  type="date"
                  value={fc.startDate || ""}
                  onChange={(e) => set("startDate", e.target.value)}
                  className={INP}
                />
              </Field>
              <Field label="End Date">
                <input
                  type="date"
                  value={fc.endDate || ""}
                  onChange={(e) => set("endDate", e.target.value)}
                  className={INP}
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                rows={3}
                value={fc.description || ""}
                onChange={(e) => set("description", e.target.value)}
                className={INP + " resize-none"}
                placeholder="What did you accomplish?"
              />
            </Field>
          </div>
        </Modal>
      )}

      {modal === "education" && (
        <Modal
          title="Add Education"
          onClose={closeModal}
          onSave={save}
          loading={saving}
        >
          <div className="space-y-4">
            <Field label="Degree / Certificate">
              <input
                value={fc.degree || ""}
                onChange={(e) => set("degree", e.target.value)}
                className={INP}
                placeholder="e.g. B.Sc Computer Science"
              />
            </Field>
            <Field label="Institution">
              <input
                value={fc.institution || ""}
                onChange={(e) => set("institution", e.target.value)}
                className={INP}
                placeholder="University / School name"
              />
            </Field>
            <Field label="Graduation Date">
              <input
                type="date"
                value={fc.graduationDate || ""}
                onChange={(e) => set("graduationDate", e.target.value)}
                className={INP}
              />
            </Field>
          </div>
        </Modal>
      )}

      {modal === "project" && (
        <Modal
          title="Add Project"
          onClose={closeModal}
          onSave={save}
          loading={saving}
        >
          <div className="space-y-4">
            <Field label="Project Title">
              <input
                value={fc.title || ""}
                onChange={(e) => set("title", e.target.value)}
                className={INP}
                placeholder="Project name"
              />
            </Field>
            <Field label="Link">
              <input
                value={fc.link || ""}
                onChange={(e) => set("link", e.target.value)}
                className={INP}
                placeholder="https://github.com/..."
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={3}
                value={fc.description || ""}
                onChange={(e) => set("description", e.target.value)}
                className={INP + " resize-none"}
                placeholder="What did you build?"
              />
            </Field>
          </div>
        </Modal>
      )}

      {modal === "certification" && (
        <Modal
          title="Add Certification"
          onClose={closeModal}
          onSave={save}
          loading={saving}
        >
          <div className="space-y-4">
            <Field label="Certificate Title">
              <input
                value={fc.title || ""}
                onChange={(e) => set("title", e.target.value)}
                className={INP}
                placeholder="e.g. AWS Certified Developer"
              />
            </Field>
            <Field label="Issuing Organization">
              <input
                value={fc.organization || ""}
                onChange={(e) => set("organization", e.target.value)}
                className={INP}
                placeholder="e.g. Amazon Web Services"
              />
            </Field>
            <Field label="Date Earned">
              <input
                type="date"
                value={fc.dateEarned || ""}
                onChange={(e) => set("dateEarned", e.target.value)}
                className={INP}
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
