import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Globe, CheckCircle, AlertCircle, Trash2 } from "lucide-react";

export default function AdminCrawlNotifications() {
  const [triggering, setTriggering] = useState(null);

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ["crawl_notifications"],
    queryFn: async () => {
      const all = await base44.entities.CrawlNotification.filter(
        {},
        "-triggered_at",
        50
      ).catch(() => []);
      return all;
    },
    refetchInterval: 10000
  });

  const handleTriggerCrawl = async (brandId, brandName, brandWebsite) => {
    setTriggering(brandId);
    try {
      await base44.functions.invoke("triggerBrandCrawl", {
        brand_id: brandId,
        brand_name: brandName,
        brand_website: brandWebsite
      });
      refetch();
    } catch (err) {
      console.error("Crawl trigger failed:", err);
    } finally {
      setTriggering(null);
    }
  };

  const handleDelete = async (notificationId) => {
    await base44.entities.CrawlNotification.delete(notificationId);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 size={14} className="animate-spin" /> Loading notifications...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground mb-1">Recent crawls</p>
        <p className="text-xs text-muted-foreground">Website crawls are auto-fetched on demand and cached for 6 months.</p>
      </div>

      {notifications?.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No crawl notifications yet.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const statusIcon = n.status === 'completed' ? CheckCircle : n.status === 'failed' ? AlertCircle : Loader2;
            const StatusIcon = statusIcon;
            const statusColor = n.status === 'completed' ? 'text-emerald-700' : n.status === 'failed' ? 'text-red-700' : 'text-amber-700';

            return (
              <div key={n.id} className="flex items-start gap-3 bg-card border border-border rounded-lg px-4 py-3">
                <StatusIcon size={14} className={`${statusColor} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{n.brand_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Triggered by {n.triggered_by?.split('@')[0]} · {new Date(n.triggered_at).toLocaleDateString()}
                  </p>
                  {n.error_message && (
                    <p className="text-xs text-red-700 mt-1">{n.error_message}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="flex-shrink-0 p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}