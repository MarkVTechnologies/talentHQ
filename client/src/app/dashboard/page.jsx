"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const routes = {
      jobseeker: "/dashboard/jobseeker",
      handyman: "/dashboard/handyman",
      employer: "/dashboard/employer",
      admin: "/dashboard-admin",
    };
    router.replace(routes[user.role] || "/login");
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-lime-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">
          Loading your dashboard…
        </p>
      </div>
    </div>
  );
}
