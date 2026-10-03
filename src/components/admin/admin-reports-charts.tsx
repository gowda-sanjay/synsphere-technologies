"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminReportsData, ReportBar } from "@/lib/services/admin-reports";

type Props = {
  trends: AdminReportsData["trends"];
  distributions: AdminReportsData["distributions"];
  rangeLabel: string;
};

function DistributionPanel({ title, description, data, color }: {
  title: string;
  description: string;
  data: ReportBar[];
  color: string;
}) {
  const hasRecords = data.some((item) => item.count > 0);
  return (
    <section className="min-w-0 border border-[#e1e7e1] bg-white p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[#152b2b]">{title}</h2>
        <p className="mt-1 text-xs text-[#657474]">{description}</p>
      </div>
      <div className="h-[270px] min-w-0 sm:h-[300px]">
        {hasRecords ? <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 34, left: -18 }}>
            <CartesianGrid stroke="#edf0eb" vertical={false} />
            <XAxis dataKey="name" interval={0} angle={-28} textAnchor="end" height={56} tick={{ fill: "#657474", fontSize: 10 }} />
            <YAxis allowDecimals={false} width={42} tick={{ fill: "#657474", fontSize: 10 }} />
            <Tooltip cursor={{ fill: "#f3f6f2" }} contentStyle={{ borderColor: "#dce4dd", borderRadius: 4, fontSize: 12 }} />
            <Bar dataKey="count" name="Records" fill={color} radius={[3, 3, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-[#657474]">No records in this report scope.</div>}
      </div>
    </section>
  );
}

export function AdminReportsCharts({ trends, distributions, rangeLabel }: Props) {
  return (
    <div className="space-y-7">
      <section>
        <div className="mb-4">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">ACTIVITY TRENDS</p>
          <h2 className="mt-1 text-lg font-semibold text-[#152b2b]">New users and applications</h2>
          <p className="mt-1 text-xs text-[#657474]">Exact counts grouped into 12 time buckets for {rangeLabel.toLowerCase()}.</p>
        </div>
        <div className="h-[300px] min-w-0 border border-[#e1e7e1] bg-white p-3 sm:h-[360px] sm:p-5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ top: 8, right: 12, bottom: 4, left: -15 }}>
              <CartesianGrid stroke="#edf0eb" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#657474", fontSize: 10 }} />
              <YAxis allowDecimals={false} width={42} tick={{ fill: "#657474", fontSize: 10 }} />
              <Tooltip contentStyle={{ borderColor: "#dce4dd", borderRadius: 4, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="users" name="New users" stroke="#176b55" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="applications" name="Applications" stroke="#d17b4c" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">PLATFORM BREAKDOWN</p>
          <h2 className="mt-1 text-lg font-semibold text-[#152b2b]">Records by status and type</h2>
          <p className="mt-1 text-xs text-[#657474]">Status/type counts are for {rangeLabel.toLowerCase()}; user roles and resume coverage show current all-time totals.</p>
        </div>
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <DistributionPanel title="Applications by status" description="Applications created in the selected range" data={distributions.applications} color="#35598b" />
          <DistributionPanel title="Jobs by status" description="Jobs created in the selected range" data={distributions.jobs} color="#8c552d" />
          <DistributionPanel title="Enrollments by status" description="Enrollments created in the selected range" data={distributions.enrollments} color="#6c5334" />
          <DistributionPanel title="Placements by status" description="Placement records created in the selected range" data={distributions.placements} color="#486c4b" />
          <DistributionPanel title="Courses by status" description="Courses created in the selected range" data={distributions.courses} color="#786098" />
          <DistributionPanel title="Companies by status" description="Companies created in the selected range" data={distributions.companies} color="#7b493e" />
          <DistributionPanel title="Notifications by type" description="Notifications created in the selected range" data={distributions.notifications} color="#3e7880" />
          <DistributionPanel title="Notifications by read state" description="Notifications created in the selected range" data={distributions.notificationsRead} color="#3e7880" />
          <DistributionPanel title="Documents by type" description="Documents uploaded in the selected range; paths and contents are not loaded" data={distributions.documents} color="#657474" />
          <DistributionPanel title="Users by assigned role" description="Current role assignments; a user may have more than one role" data={distributions.userRoles} color="#176b55" />
          <DistributionPanel title="Resume coverage" description="Current profile resume references" data={distributions.resumes} color="#d17b4c" />
        </div>
      </section>
    </div>
  );
}
