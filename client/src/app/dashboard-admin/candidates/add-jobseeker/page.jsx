"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSuperAdminAuthRedirect } from "@/app/utils/superAdminAuthRedirect";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Lock,
  Eye,
  EyeOff,
  Github,
  Linkedin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  X,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE;

const JOB_CATEGORIES = [
  "Technology",
  "Finance",
  "Marketing",
  "Design",
  "Sales",
  "Healthcare",
  "Engineering",
  "Education",
  "Administration",
  "Accounting",
  "Legal",
  "Operations",
  "Human Resources",
  "Other",
];
const EXP_LEVELS = [
  "Entry Level",
  "Junior",
  "Mid Level",
  "Senior",
  "Expert / Lead",
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

function Section({ title, icon: Icon, children, accent = "primary" }) {
  const colors = {
    primary: "bg-primary-50 text-primary-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
      <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center ${colors[accent]}`}
        >
          <Icon size={15} />
        </div>
        <h3 className="font-black text-gray-900 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function PasswordStrength({ password }) {
  const c = {
    l: password.length >= 8,
    u: /[A-Z]/.test(password),
    lo: /[a-z]/.test(password),
    n: /[0-9]/.test(password),
    s: /[!@#$%^&*]/.test(password),
  };
  const score = Object.values(c).filter(Boolean).length;
  const clrs = [
    "",
    "bg-red-500",
    "bg-red-400",
    "bg-amber-400",
    "bg-lime-500",
    "bg-green-500",
  ];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full ${i <= score ? clrs[score] : "bg-gray-200"} transition-all`}
          />
        ))}
        <span className="text-[10px] font-bold ml-1 text-gray-400">
          {["", "Weak", "Weak", "Fair", "Good", "Strong"][score]}
        </span>
      </div>
    </div>
  );
}

export default function AddJobseekerPage() {
  const isAuthorized = useSuperAdminAuthRedirect();
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    whatsapp: "",
    password: "",
    confirmPassword: "",
    headline: "",
    tagline: "",
    state: "",
    city: "",
    jobCategory: "",
    experienceLevel: "",
    linkedin: "",
    github: "",
    expectedSalary: "",
    workSummary: "",
  });
  const [preferredTypes, setPreferredTypes] = useState([]);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const toggleType = (t) =>
    setPreferredTypes((p) =>
      p.includes(t) ? p.filter((x) => x !== t) : [...p, t],
    );

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
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        whatsapp: form.whatsapp,
        role: "jobseeker",
        headline: form.headline,
        tagline: form.tagline,
        location: { city: form.city, country: "Nigeria", area: form.state },
        linkedin: form.linkedin,
        github: form.github,
      };
      // signup2 only creates the account with fullName/email/password/role —
      // the rest of this form's fields are then patched on via the existing
      // superadmin update endpoint.
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

      notify("Jobseeker created successfully!");
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
        <div className="w-10 h-10 border-4 border-lime-500 border-t-transparent rounded-full animate-spin" />
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
        <h1 className="text-2xl font-black text-gray-900">Add Jobseeker</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create a new jobseeker / talent profile on the platform
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
                placeholder="e.g. Adaeze Nwosu"
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
              <label className={LBL}>Phone</label>
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

        <Section title="Professional Profile" icon={Briefcase} accent="blue">
          <div>
            <label className={LBL}>Professional Headline</label>
            <input
              value={form.headline}
              onChange={(e) => set("headline", e.target.value)}
              placeholder="e.g. Senior React Developer | 5 Years Experience"
              className={INP}
            />
          </div>
          <div>
            <label className={LBL}>Tagline</label>
            <input
              value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="e.g. Building products that matter"
              className={INP}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Job Category *</label>
              <select
                value={form.jobCategory}
                onChange={(e) => set("jobCategory", e.target.value)}
                className={`${INP} cursor-pointer appearance-none`}
                required
              >
                <option value="">Select Category</option>
                {JOB_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LBL}>Experience Level</label>
              <select
                value={form.experienceLevel}
                onChange={(e) => set("experienceLevel", e.target.value)}
                className={`${INP} cursor-pointer appearance-none`}
              >
                <option value="">Select Level</option>
                {EXP_LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={LBL}>Preferred Job Types</label>
            <div className="flex flex-wrap gap-2">
              {[
                "Full-time",
                "Part-time",
                "Contract",
                "Remote",
                "Internship",
              ].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${preferredTypes.includes(t) ? "bg-primary-500 text-white border-primary-500" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>LinkedIn</label>
              <div className="relative">
                <Linkedin
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={form.linkedin}
                  onChange={(e) => set("linkedin", e.target.value)}
                  placeholder="https://linkedin.com/in/…"
                  className={`${INP} pl-9`}
                />
              </div>
            </div>
            <div>
              <label className={LBL}>GitHub</label>
              <div className="relative">
                <Github
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={form.github}
                  onChange={(e) => set("github", e.target.value)}
                  placeholder="https://github.com/…"
                  className={`${INP} pl-9`}
                />
              </div>
            </div>
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
              <label className={LBL}>City / Area</label>
              <div className="relative">
                <MapPin
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="e.g. Lekki"
                  className={`${INP} pl-9`}
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
                <User size={16} />
                Create Jobseeker
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
