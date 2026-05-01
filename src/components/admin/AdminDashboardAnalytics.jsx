import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp, AlertCircle, CheckCircle, Flag } from "lucide-react";

export default function AdminDashboardAnalytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin_analytics"],
    queryFn: async () => {
      const [reports, suggestions, flags, crawls] = await Promise.all([
        base44.entities.BrandCategoryReport.filter({ status: "pending_review" }).catch(() => []),
        base44.entities.BrandSuggestion.filter({ ai_verification_status: "pending" }).catch(() => []),
        base44.entities.ContentFlag.filter({ status: "pending" }).catch(() => []),
        base44.entities.CrawlNotification.filter({ status: "completed" }, "-triggered_at", 30).catch(() => [])
      ]);

      return {
        reports_pending: reports.length,
        suggestions_pending: suggestions.length,
        flags_pending: flags.length,
        crawls_recent: crawls.length
      };
    },
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 size={14} className="animate-spin" /> Loading analytics...
      </div>
    );
  }

  const metrics = [
    { label: "Reports Pending", value: stats?.reports_pending || 0, icon: TrendingUp, color: "text-blue-700" },
    { label: "Suggestions", value: stats?.suggestions_pending || 0, icon: AlertCircle, color: "text-amber-700" },
    { label: "Content Flags", value: stats?.flags_pending || 0, icon: Flag, color: "text-red-700" },
    { label: "Crawls (30d)", value: stats?.crawls_recent || 0, icon: CheckCircle, color: "text-emerald-700" }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {metrics.map((m, i) => {
        const Icon = m.icon;
        return (
          <div key={i} className="bg-card border border-border rounded-lg px-4 py-3 text-center">
            <Icon size={16} className={`${m.color} mx-auto mb-2`} />
            <p className="text-2xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
          </div>
        );
      })}
    </div>
  );
}