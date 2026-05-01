import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import NavBar from "@/components/NavBar";
import AdminSuggestions from "@/components/admin/AdminSuggestions";
import AdminReports from "@/components/admin/AdminReports";
import AdminResearch from "@/components/admin/AdminResearch";
import AdminReviewQueue from "@/components/admin/AdminReviewQueue";
import AdminDashboardAnalytics from "@/components/admin/AdminDashboardAnalytics";
import AdminContentFlagNotifications from "@/components/admin/AdminContentFlagNotifications";
import { ClipboardList, FileText, Search, Inbox } from "lucide-react";

const TABS = [
  { id: "review", label: "Review Queue", icon: Inbox },
  { id: "research", label: "AI Research", icon: Search },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "suggestions", label: "Suggestions", icon: ClipboardList },
];

export default function Admin() {
  const [tab, setTab] = useState("review");
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      // Log admin access to audit trail
      if (u?.role === 'admin') {
        base44.asServiceRole.entities.Audit.create({
          action: 'create',
          entity_type: 'AdminAccess',
          entity_id: 'session-' + Date.now(),
          performed_by_email: u.email,
          reason: `Admin accessed dashboard at ${new Date().toISOString()}`,
          timestamp: new Date().toISOString()
        }).catch(() => {}); // fail silently
      }
    }).catch(() => {});
  }, []);

  // Still loading — don't flash the admin UI
  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-accent/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-playfair text-2xl font-bold text-foreground mb-2">Access restricted</h1>
          <p className="text-muted-foreground">This area is for administrators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Administration</p>
          <h1 className="font-syne text-4xl font-bold text-foreground">Admin Dashboard</h1>
        </div>

        {/* Analytics dashboard */}
        <div className="mb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Quick Stats</p>
          <AdminDashboardAnalytics />
        </div>

        {/* Alerts */}
        <div className="mb-8 space-y-3">
          <AdminContentFlagNotifications />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-8 max-w-lg">
          {TABS.map(({ id, label, icon: TabIcon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TabIcon size={14} />
              {label}
            </button>
          ))}
        </div>

        {tab === "review" && <AdminReviewQueue />}
        {tab === "research" && <AdminResearch />}
        {tab === "reports" && <AdminReports />}
        {tab === "suggestions" && <AdminSuggestions />}
      </div>
    </div>
  );
}