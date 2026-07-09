"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  User,
  X,
  Shield,
  AlertTriangle,
  MessageSquare,
  Zap,
  Crown,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar({ open, setOpen }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const navItems = {
    jobseeker: [
      { href: "/dashboard/jobseeker", label: "Overview" },
      { href: "/dashboard/jobseeker/browse-jobs", label: "Browse Jobs" },
      { href: "/dashboard/jobseeker/applications", label: "My Applications" },
      { href: "/dashboard/jobseeker/interviews", label: "Interview Invites" },
      { href: "/dashboard/jobseeker/profile", label: "My Profile" },
      {
        href: "/dashboard/jobseeker/upgrade",
        label: "Upgrade to Premium",
        icon: Crown,
      },
      { href: "/dashboard/jobseeker/messages", label: "Messages", badge: true },
      { href: "/account/settings", label: "Account & Security", icon: Shield },
    ],
    handyman: [
      { href: "/dashboard/handyman", label: "Overview" },
      { href: "/dashboard/handyman/jobs", label: "Browse Jobs" },
      { href: "/dashboard/handyman/applications", label: "My Applications" },
      { href: "/dashboard/handyman/interviews", label: "Interview Invites" },
      { href: "/dashboard/handyman/profile", label: "My Profile & Portfolio" },
      { href: "/dashboard/handyman/messages", label: "Messages", badge: true },
      { href: "/account/settings", label: "Account & Security", icon: Shield },
    ],
    employer: [
      { href: "/dashboard/employer", label: "Overview" },
      { href: "/dashboard/employer/candidates", label: "Browse Candidates" },
      {
        href: "/dashboard/employer/applications",
        label: "Applications Pipeline",
      },
      { href: "/dashboard/employer/interviews", label: "Interviews" },
      { href: "/dashboard/employer/my-jobs", label: "My Jobs" },
      { href: "/dashboard/employer/post-job", label: "Post a Job" },
      {
        href: "/dashboard/employer/billing",
        label: "Billing & Plans",
        icon: Zap,
      },
      { href: "/dashboard/employer/messages", label: "Messages", badge: true },
      { href: "/account/settings", label: "Account & Security", icon: Shield },
    ],
    admin: [
      { href: "/dashboard-admin", label: "Overview" },
      { href: "/dashboard-admin/candidates/employers", label: "Manage Users" },
    ],
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const NavLink = ({ item, onClick }) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-lime-600 text-white font-semibold"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {Icon && (
          <Icon
            size={14}
            className={isActive ? "text-white" : "text-gray-400"}
          />
        )}
        {item.label}
      </Link>
    );
  };

  const UserFooter = ({ onLogout }) => (
    <div className="border-t pt-4 mt-4">
      {/* Unverified email warning */}
      {user && !user.emailVerified && (
        <Link
          href="/account/settings"
          className="flex items-center gap-2 px-3 py-2 mb-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 hover:bg-amber-100 transition"
        >
          <AlertTriangle size={12} className="text-amber-600 flex-shrink-0" />
          Verify your email
        </Link>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.fullName}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.fullName?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{user?.fullName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
          title="Logout"
        >
          <LogOut className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed inset-y-0 left-0 w-64 bg-white border-r shadow-lg p-4 flex flex-col justify-between z-50 md:hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-black">
                  Talent<span className="text-lime-600">HQ</span>
                </span>
                <button
                  className="p-2 rounded hover:bg-gray-100"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              <nav className="space-y-1">
                {user?.role &&
                  navItems[user.role]?.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      onClick={() => setOpen(false)}
                    />
                  ))}
              </nav>
            </div>
            {user && <UserFooter onLogout={handleLogout} />}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r shadow-sm p-4 justify-between min-h-screen">
        <div>
          <Link href="/" className="block mb-6">
            <span className="text-lg font-black">
              Talent<span className="text-lime-600">HQ</span>
            </span>
          </Link>
          <nav className="space-y-1">
            {user?.role &&
              navItems[user.role]?.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
          </nav>
        </div>
        {user && <UserFooter onLogout={handleLogout} />}
      </aside>
    </>
  );
}
