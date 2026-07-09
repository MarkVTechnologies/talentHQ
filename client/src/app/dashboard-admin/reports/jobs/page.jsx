"use client";
export const dynamic = "force-dynamic";

import { Briefcase } from "lucide-react";
import ReportsQueue from "@/components/ReportsQueue";

export default function ReportedJobsPage() {
  return (
    <ReportsQueue
      title="Reported Jobs"
      icon={Briefcase}
      allowedTypes={["job"]}
      typeTabs={null}
      emptyLabel="job reports"
    />
  );
}
