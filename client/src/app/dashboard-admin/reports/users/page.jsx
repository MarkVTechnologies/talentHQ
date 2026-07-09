"use client";
export const dynamic = "force-dynamic";

import { Users } from "lucide-react";
import ReportsQueue from "@/components/ReportsQueue";

export default function ReportedUsersPage() {
  return (
    <ReportsQueue
      title="Reported Users"
      icon={Users}
      allowedTypes={["employer", "handyman", "jobseeker"]}
      typeTabs={[
        { value: "all", label: "All Users" },
        { value: "employer", label: "Employers" },
        { value: "handyman", label: "Handymen" },
        { value: "jobseeker", label: "Jobseekers" },
      ]}
      emptyLabel="user reports"
    />
  );
}
