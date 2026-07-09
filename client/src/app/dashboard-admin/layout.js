"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Briefcase,
  ShieldCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Wrench,
  Building2,
  UserCheck,
  Plus,
  List,
  Flag,
  Megaphone,
  TrendingUp,
  Bell,
  Search,
  ChevronDown,
} from "lucide-react";

// ── Navigation structure ──────────────────────────────────────────────────────
const NAV = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard-admin",
  },
  {
    id: "candidates",
    label: "Manage Users",
    icon: Users,
    children: [
      {
        label: "Employers",
        href: "/dashboard-admin/candidates/employers",
        icon: Building2,
      },
      {
        label: "Add Employer",
        href: "/dashboard-admin/candidates/add-employer",
        icon: Plus,
      },
      {
        label: "Handymen",
        href: "/dashboard-admin/candidates/handymen",
        icon: Wrench,
      },
      {
        label: "Add Handyman",
        href: "/dashboard-admin/candidates/add-handyman",
        icon: Plus,
      },
      {
        label: "Jobseekers",
        href: "/dashboard-admin/candidates/jobseekers",
        icon: UserCheck,
      },
      {
        label: "Add Jobseeker",
        href: "/dashboard-admin/candidates/add-jobseeker",
        icon: Plus,
      },
    ],
  },
  {
    id: "jobs",
    label: "Jobs",
    icon: Briefcase,
    children: [
      {
        label: "Post New Job",
        href: "/dashboard-admin/jobs/new-job",
        icon: Plus,
      },
      { label: "All Jobs", href: "/dashboard-admin/jobs/all", icon: List },
    ],
  },
  {
    id: "moderation",
    label: "Moderation",
    icon: Flag,
    href: "/dashboard-admin/moderation",
  },
  {
    id: "verification",
    label: "Verification",
    icon: ShieldCheck,
    href: "/dashboard-admin/employer-verification",
  },
  {
    id: "reports",
    label: "Reports",
    icon: Flag,
    children: [
      { label: "Reported Users", href: "/dashboard-admin/reports/users", icon: Users },
      { label: "Reported Jobs", href: "/dashboard-admin/reports/jobs", icon: Briefcase },
    ],
  },
  {
    id: "announcements",
    label: "Announcements",
    icon: Megaphone,
    href: "/dashboard-admin/announcements",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    children: [
      { label: "User Analytics", href: "/dashboard-admin/stats/users", icon: Users },
      { label: "Job Analytics", href: "/dashboard-admin/stats/jobs", icon: TrendingUp },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    href: "/dashboard-admin/settings/profile",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function isRouteActive(href, pathname) {
  return pathname === href;
}
function isGroupActive(children, pathname) {
  return children?.some((c) => pathname.startsWith(c.href));
}

// ── Sidebar nav item ──────────────────────────────────────────────────────────
function NavItem({ item, pathname, open, onToggle, onClose }) {
  const Icon = item.icon;
  const hasChildren = !!item.children?.length;
  const active = item.href
    ? isRouteActive(item.href, pathname)
    : isGroupActive(item.children, pathname);
  const isOpen = open === item.id;

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
          active
            ? "bg-white/15 text-white shadow-sm"
            : "text-primary-200 hover:bg-white/8 hover:text-white"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
            active ? "bg-lime-500/20" : "group-hover:bg-white/10"
          }`}
        >
          <Icon size={16} className={active ? "text-lime-400" : ""} />
        </div>
        <span className="flex-1">{item.label}</span>
        {active && (
          <span className="w-1.5 h-1.5 rounded-full bg-lime-400 flex-shrink-0" />
        )}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => onToggle(item.id)}
        className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
          active
            ? "bg-white/15 text-white"
            : "text-primary-200 hover:bg-white/8 hover:text-white"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
            active ? "bg-lime-500/20" : "group-hover:bg-white/10"
          }`}
        >
          <Icon size={16} className={active ? "text-lime-400" : ""} />
        </div>
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronRight
          size={14}
          className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""} ${active ? "text-lime-400" : "text-primary-400"}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="ml-4 pl-4 border-l border-white/10 mt-1 space-y-0.5 pb-1">
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                const childActive = isRouteActive(child.href, pathname);
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      childActive
                        ? "bg-lime-500/20 text-lime-300"
                        : "text-primary-300 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <ChildIcon size={13} className="flex-shrink-0" />
                    {child.label}
                    {childActive && (
                      <span className="ml-auto w-1 h-1 rounded-full bg-lime-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ mobileOpen, onMobileClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroup, setOpenGroup] = useState(() => {
    // Auto-open the group that contains the current route
    const active = NAV.find((item) =>
      item.children?.some((c) => pathname.startsWith(c.href)),
    );
    return active?.id || "";
  });

  const toggleGroup = (id) => setOpenGroup((prev) => (prev === id ? "" : id));

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("refreshToken");
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/superadmin/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: token }),
      });
    } catch {}
    localStorage.clear();
    router.push("/admin/login");
  };

  const sidebarContent = (
    <div
      className="flex flex-col h-full bg-primary-900"
      style={{
        background:
          "linear-gradient(180deg, #003017 0%, #002411 50%, #001a0d 100%)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-lime-500 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} className="text-primary-900" />
          </div>
          <div>
            <p className="text-white font-black text-sm leading-none">
              TalentHQ
            </p>
            <p className="text-primary-400 text-[10px] font-semibold mt-0.5 uppercase tracking-wider">
              Super Admin
            </p>
          </div>
        </div>
        <button
          onClick={onMobileClose}
          className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-primary-300"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-hide">
        {NAV.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            pathname={pathname}
            open={openGroup}
            onToggle={toggleGroup}
            onClose={onMobileClose}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-5 pt-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={14} className="text-lime-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-bold truncate">Super Admin</p>
            <p className="text-primary-400 text-[10px] truncate">Full access</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10">
            <LogOut size={15} />
          </div>
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 min-h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 left-0 w-64 z-50 md:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ onMenuClick }) {
  const pathname = usePathname();

  // Build breadcrumb from pathname
  const crumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((seg, i, arr) => ({
      label: seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      href: "/" + arr.slice(0, i + 1).join("/"),
    }));

  return (
    <header className="bg-white border-b border-gray-100 px-5 py-3.5 flex items-center gap-4 sticky top-0 z-30">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition flex-shrink-0"
      >
        <Menu size={18} />
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
            )}
            {i === crumbs.length - 1 ? (
              <span className="font-bold text-gray-900 truncate">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-gray-400 hover:text-gray-700 transition truncate"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition relative">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
          <ShieldCheck size={15} className="text-white" />
        </div>
      </div>
    </header>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function SuperAdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 p-5 sm:p-7">{children}</main>

        {/* Footer */}
        <footer className="px-7 py-4 border-t border-gray-100 text-xs text-gray-400 font-medium">
          TalentHQ Super Admin · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
