"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSuperAdminAuthRedirect } from "@/app/utils/superAdminAuthRedirect";
import {
  Building2,
  Globe,
  Phone,
  Mail,
  MapPin,
  Users,
  Lock,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  User,
  Hash,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE;

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Legal",
  "Education",
  "Marketing",
  "Engineering",
  "Agriculture",
  "Operations",
  "Sales",
  "Logistics",
  "Media",
  "Construction",
  "Real Estate",
  "Other",
];
const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const DESIGNATIONS = [
  "CEO",
  "COO",
  "HR Manager",
  "Recruiter",
  "Supervisor",
  "Director",
  "Manager",
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
        <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center">
          <Icon size={15} className="text-primary-600" />
        </div>
        <h3 className="font-black text-gray-900 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function PasswordStrength({ password }) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const label = score <= 2 ? "Weak" : score <= 4 ? "Fair" : "Strong";
  const colors = [
    "bg-red-500",
    "bg-red-500",
    "bg-orange-400",
    "bg-amber-400",
    "bg-lime-500",
    "bg-green-500",
  ];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i < score ? colors[score] : "bg-gray-200"}`}
          />
        ))}
        <span
          className={`text-[10px] font-bold ml-2 ${score <= 2 ? "text-red-500" : score <= 4 ? "text-amber-500" : "text-green-600"}`}
        >
          {label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {Object.entries({
          "8+ chars": checks.length,
          Uppercase: checks.uppercase,
          Lowercase: checks.lowercase,
          Number: checks.number,
          "Special char": checks.special,
        }).map(([k, v]) => (
          <p
            key={k}
            className={`text-[11px] flex items-center gap-1 ${v ? "text-green-600" : "text-gray-400"}`}
          >
            {v ? "✓" : "○"} {k}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function AddEmployerPage() {
  const isAuthorized = useSuperAdminAuthRedirect();
  const router = useRouter();

  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    companySize: "",
    state: "",
    lga: "",
    address: "",
    email: "",
    phone: "",
    companyWebsite: "",
    companyLinkedin: "",
    cacNumber: "",
    password: "",
    confirmPassword: "",
    logo: null,
    agreeToTerms: false,
    contactPersonName: "",
    contactPersonDesignation: "",
    contactPersonEmail: "",
    contactPersonPhone: "",
    fullName: "",
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    set("logo", file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const checkPass = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(form.password),
  };
  const passValid = Object.values(checkPass).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passValid) {
      notify("Password doesn't meet all requirements", "error");
      return;
    }
    if (form.password !== form.confirmPassword) {
      notify("Passwords do not match", "error");
      return;
    }
    if (!form.agreeToTerms) {
      notify("Please agree to the terms", "error");
      return;
    }

    setLoading(true);
    try {
      let logoBase64 = null;
      if (form.logo) {
        logoBase64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(form.logo);
        });
      }

      const payload = { ...form, logo: logoBase64 };
      delete payload.confirmPassword;
      delete payload.agreeToTerms;

      // signup2 creates the account with its core fields (name/email/password/
      // companyName/companyWebsite); the rest of this form's fields are then
      // patched on via the existing superadmin update endpoint.
      const res = await fetch(`${API}/api/auth/signup2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, role: "employer" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create employer");

      const superadminToken = localStorage.getItem("superadminToken");
      await fetch(`${API}/api/superadmin/users/${data.user._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superadminToken}`,
        },
        body: JSON.stringify({ ...payload, role: "employer" }),
      });

      notify("Employer created successfully!");
      setTimeout(() => router.push("/dashboard-admin"), 1500);
    } catch (err) {
      notify(err.message || "An error occurred", "error");
    } finally {
      setLoading(false);
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
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-lime-600 text-white"
          }`}
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
        <h1 className="text-2xl font-black text-gray-900">Add Employer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create a new employer / company account on the platform
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info */}
        <Section title="Company Information" icon={Building2}>
          <div>
            <label className={LBL}>Company Name *</label>
            <input
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder="e.g. Okafor Tech Solutions"
              className={INP}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Industry *</label>
              <select
                value={form.industry}
                onChange={(e) => set("industry", e.target.value)}
                className={`${INP} cursor-pointer appearance-none`}
                required
              >
                <option value="">Select Industry</option>
                {INDUSTRIES.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LBL}>Company Size *</label>
              <select
                value={form.companySize}
                onChange={(e) => set("companySize", e.target.value)}
                className={`${INP} cursor-pointer appearance-none`}
                required
              >
                <option value="">Select Size</option>
                {COMPANY_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} employees
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={LBL}>CAC Registration Number</label>
            <div className="relative">
              <Hash
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={form.cacNumber}
                onChange={(e) => set("cacNumber", e.target.value)}
                placeholder="e.g. RC1234567"
                className={`${INP} pl-9`}
              />
            </div>
          </div>
        </Section>

        {/* Logo */}
        <Section title="Company Logo" icon={Upload}>
          <div className="flex items-center gap-5">
            <div
              className={`w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 ${logoPreview ? "" : "bg-gray-50"}`}
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="logo"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <Building2 size={24} className="text-gray-300" />
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 px-4 py-2.5 bg-primary-50 border border-primary-200 text-primary-700 font-semibold text-sm rounded-xl cursor-pointer hover:bg-primary-100 transition">
                <Upload size={14} /> Upload Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogo}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">
                PNG, JPG or SVG • Max 2MB • Square recommended
              </p>
            </div>
          </div>
        </Section>

        {/* Location */}
        <Section title="Location" icon={MapPin}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>State *</label>
              <select
                value={form.state}
                onChange={(e) => {
                  set("state", e.target.value);
                  set("lga", "");
                }}
                className={`${INP} cursor-pointer appearance-none`}
                required
              >
                <option value="">Select State</option>
                {NIGERIA_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LBL}>LGA</label>
              <input
                value={form.lga}
                onChange={(e) => set("lga", e.target.value)}
                placeholder="Local Government Area"
                className={INP}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={LBL}>Full Address *</label>
              <input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Street address, building, area"
                className={INP}
                required
              />
            </div>
          </div>
        </Section>

        {/* Contact */}
        <Section title="Contact Details" icon={Phone}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  placeholder="company@email.com"
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
              <label className={LBL}>Website</label>
              <div className="relative">
                <Globe
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={form.companyWebsite}
                  onChange={(e) => set("companyWebsite", e.target.value)}
                  placeholder="https://company.com"
                  className={`${INP} pl-9`}
                />
              </div>
            </div>
            <div>
              <label className={LBL}>LinkedIn</label>
              <div className="relative">
                <Globe
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={form.companyLinkedin}
                  onChange={(e) => set("companyLinkedin", e.target.value)}
                  placeholder="https://linkedin.com/company/…"
                  className={`${INP} pl-9`}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Contact person */}
        <Section title="Contact Person" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Full Name *</label>
              <input
                value={form.contactPersonName}
                onChange={(e) => set("contactPersonName", e.target.value)}
                placeholder="Contact person's name"
                className={INP}
                required
              />
            </div>
            <div>
              <label className={LBL}>Designation *</label>
              <select
                value={form.contactPersonDesignation}
                onChange={(e) =>
                  set("contactPersonDesignation", e.target.value)
                }
                className={`${INP} cursor-pointer appearance-none`}
                required
              >
                <option value="">Select Role</option>
                {DESIGNATIONS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LBL}>Email *</label>
              <input
                type="email"
                value={form.contactPersonEmail}
                onChange={(e) => set("contactPersonEmail", e.target.value)}
                placeholder="contact@email.com"
                className={INP}
                required
              />
            </div>
            <div>
              <label className={LBL}>Phone *</label>
              <input
                value={form.contactPersonPhone}
                onChange={(e) => set("contactPersonPhone", e.target.value)}
                placeholder="080xxxxxxxx"
                className={INP}
                required
              />
            </div>
          </div>
        </Section>

        {/* Account */}
        <Section title="Account Credentials" icon={Lock}>
          <div>
            <label className={LBL}>Full Name (Account) *</label>
            <input
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="Account holder name"
              className={INP}
              required
            />
          </div>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                type={showConfirm ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                placeholder="Re-enter password"
                className={`${INP} pl-9 pr-10`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={10} /> Passwords do not match
              </p>
            )}
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.agreeToTerms}
              onChange={(e) => set("agreeToTerms", e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600 accent-primary-500"
            />
            <span className="text-sm text-gray-600">
              This employer agrees to TalentHQ's{" "}
              <span className="text-primary-600 font-semibold">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="text-primary-600 font-semibold">
                Privacy Policy
              </span>
            </span>
          </label>
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
                <Building2 size={16} />
                Create Employer
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
