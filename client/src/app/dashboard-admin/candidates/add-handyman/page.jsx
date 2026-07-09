"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSuperAdminAuthRedirect } from "@/app/utils/superAdminAuthRedirect";
import {
  Wrench,
  MapPin,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Award,
  User,
  Plus,
  X,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE;

const TRADES = [
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Tiling",
  "Painting",
  "Welding",
  "Masonry",
  "AC Repair",
  "Generator Repair",
  "Roofing",
  "Glazing",
  "Landscaping",
  "Fumigation",
  "Other",
];
const NIGERIA_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

const INP =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400 bg-gray-50 focus:bg-white transition placeholder:text-gray-400";
const LBL =
  "block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide";

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
      <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
          <Icon size={15} className="text-amber-600" />
        </div>
        <h3 className="font-black text-gray-900 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function PasswordStrength({ password }) {
  const c = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    num: /[0-9]/.test(password),
    spec: /[!@#$%^&*]/.test(password),
  };
  const score = Object.values(c).filter(Boolean).length;
  const colors = [
    "",
    "bg-red-500",
    "bg-red-400",
    "bg-amber-400",
    "bg-lime-500",
    "bg-green-500",
  ];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full ${i <= score ? colors[score] : "bg-gray-200"} transition-all`}
          />
        ))}
        <span className="text-[10px] font-bold ml-1 text-gray-500">
          {["", "Weak", "Weak", "Fair", "Good", "Strong"][score]}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
        {[
          ["8+ chars", c.length],
          ["Uppercase", c.upper],
          ["Lowercase", c.lower],
          ["Number", c.num],
          ["Special", c.spec],
        ].map(([l, v]) => (
          <span
            key={l}
            className={`text-[11px] ${v ? "text-green-600" : "text-gray-400"}`}
          >
            {v ? "✓" : "○"} {l}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AddHandymanPage() {
  const isAuthorized = useSuperAdminAuthRedirect();
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    whatsapp: "",
    password: "",
    confirmPassword: "",
    state: "",
    location: "",
    trade: "",
    yearsExperience: "",
    bio: "",
    certifications: "",
  });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills((p) => [...p, s]);
      setSkillInput("");
    }
  };
  const removeSkill = (s) => setSkills((p) => p.filter((x) => x !== s));

  const passValid = [
    form.password.length >= 8,
    /[A-Z]/.test(form.password),
    /[a-z]/.test(form.password),
    /[0-9]/.test(form.password),
  ].every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passValid) {
      notify("Password is too weak", "error");
      return;
    }
    if (form.password !== form.confirmPassword) {
      notify("Passwords do not match", "error");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        skills,
        role: "handyman",
        yearsExperience: Number(form.yearsExperience) || 0,
      };
      delete payload.confirmPassword;

      // signup2 only creates the account with fullName/email/password/role/
      // skills/location — the rest of this form's fields are then patched on
      // via the existing superadmin update endpoint.
      const res = await fetch(`${API}/api/auth/signup2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");

      const superadminToken = localStorage.getItem("superadminToken");
      await fetch(`${API}/api/superadmin/users/${data.user._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superadminToken}`,
        },
        body: JSON.stringify(payload),
      });

      notify("Handyman created successfully!");
      setTimeout(() => router.push("/dashboard-admin"), 1500);
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="max-w-3xl space-y-6">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold ${toast.type === "error" ? "bg-red-600 text-white" : "bg-lime-600 text-white"}`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={16} />
          ) : (
            <CheckCircle2 size={16} />
          )}
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black text-gray-900">Add Handyman</h1>
        <p className="text-sm text-gray-500 mt-1">
          Register a skilled trade professional on TalentHQ
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="Personal Information" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Full Name *</label>
              <input
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                placeholder="e.g. Musa Balogun"
                className={INP}
                required
              />
            </div>
            <div>
              <label className={LBL}>Email *</label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email@example.com"
                  className={`${INP} pl-9`}
                  required
                />
              </div>
            </div>
            <div>
              <label className={LBL}>Phone *</label>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="080xxxxxxxx"
                  className={`${INP} pl-9`}
                  required
                />
              </div>
            </div>
            <div>
              <label className={LBL}>WhatsApp</label>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  placeholder="080xxxxxxxx"
                  className={`${INP} pl-9`}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Trade & Experience" icon={Wrench}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Trade / Specialty *</label>
              <select
                value={form.trade}
                onChange={(e) => set("trade", e.target.value)}
                className={`${INP} cursor-pointer appearance-none`}
                required
              >
                <option value="">Select Trade</option>
                {TRADES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LBL}>Years of Experience</label>
              <input
                type="number"
                min="0"
                max="50"
                value={form.yearsExperience}
                onChange={(e) => set("yearsExperience", e.target.value)}
                placeholder="e.g. 5"
                className={INP}
              />
            </div>
          </div>

          {/* Skills tags */}
          <div>
            <label className={LBL}>Skills</label>
            <div className="flex gap-2 mb-2">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Type a skill and press Enter"
                className={`${INP} flex-1`}
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-4 py-2 bg-primary-500 text-white text-sm font-bold rounded-xl hover:bg-primary-600 transition flex items-center gap-1"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 text-xs font-semibold rounded-full border border-amber-100"
                  >
                    <Wrench size={10} />
                    {s}
                    <button type="button" onClick={() => removeSkill(s)}>
                      <X
                        size={10}
                        className="text-amber-600 hover:text-red-500"
                      />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={LBL}>Certifications</label>
            <input
              value={form.certifications}
              onChange={(e) => set("certifications", e.target.value)}
              placeholder="e.g. COREN Certified, NABTEB, City & Guilds (comma separated)"
              className={INP}
            />
          </div>

          <div>
            <label className={LBL}>Bio / About</label>
            <textarea
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              rows={3}
              placeholder="Brief description of the handyman's expertise and background..."
              className={`${INP} resize-none`}
            />
          </div>
        </Section>

        <Section title="Location" icon={MapPin}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>State</label>
              <select
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                className={`${INP} cursor-pointer appearance-none`}
              >
                <option value="">Select State</option>
                {NIGERIA_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LBL}>City / Area *</label>
              <div className="relative">
                <MapPin
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="e.g. Surulere, Lagos"
                  className={`${INP} pl-9`}
                  required
                />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Account Password" icon={Lock}>
          <div>
            <label className={LBL}>Password *</label>
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Create a strong password"
                className={`${INP} pl-9 pr-10`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {form.password && <PasswordStrength password={form.password} />}
          </div>
          <div>
            <label className={LBL}>Confirm Password *</label>
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                placeholder="Re-enter password"
                className={`${INP} pl-9`}
                required
              />
            </div>
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={10} />
                Passwords do not match
              </p>
            )}
          </div>
        </Section>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2.5 px-8 py-3.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-black rounded-2xl text-sm transition shadow-lg shadow-primary-500/20"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Wrench size={16} />
                Add Handyman
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard-admin")}
            className="px-6 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-2xl text-sm hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
