import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import NavBar from "@/components/NavBar";
import { CheckCircle, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TYPES = [
  { value: "new_brand", label: "Suggest a new brand" },
  { value: "missing_category", label: "Missing product category" },
  { value: "report_correction", label: "Correction to an existing report" },
  { value: "new_source", label: "Add a new source or evidence" },
  { value: "repair_experience", label: "Share a repair/warranty experience" },
  { value: "quality_experience", label: "Share a quality/durability experience" },
];

export default function Suggest() {
  const [form, setForm] = useState({ correction_type: "new_brand", brand_name: "", note: "", submitted_source_url: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    // Mark the user's data as deleted via a correction record, then log out
    await base44.entities.UserCorrection.create({
      correction_type: "report_correction",
      note: `[ACCOUNT DELETION REQUEST] User ${user?.email} requested account deletion.`,
      status: "pending",
    }).catch(() => {});
    base44.auth.logout();
  };
  const [user, setUser] = useState(undefined); // undefined = still checking

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) base44.auth.me().then(setUser).catch(() => setUser(null));
      else setUser(null);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.entities.UserCorrection.create({
      correction_type: form.correction_type,
      brand_name: form.brand_name,
      note: form.note,
      submitted_source_url: form.submitted_source_url,
      status: "pending",
    });
    setSubmitted(true);
    setLoading(false);
  };

  if (user === undefined) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-accent/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <h1 className="font-syne text-2xl font-bold text-foreground mb-3">Login required</h1>
          <p className="text-muted-foreground mb-6">You need to be logged in to submit suggestions or corrections.</p>
          <button
            onClick={() => base44.auth.redirectToLogin(window.location.href)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Log in to continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      <NavBar />
      <div className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Community</p>
        <h1 className="font-syne text-4xl font-bold text-foreground mb-3">Suggest or correct</h1>
        <p className="text-muted-foreground mb-10 leading-relaxed">
          Know a brand we missed? Have better evidence? Experienced a repair process — good or bad? 
          Your input goes to our admin review queue. All suggestions are manually verified.
        </p>

        {submitted ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <CheckCircle className="text-emerald-600 mx-auto mb-4" size={40} />
            <h2 className="font-syne text-2xl font-semibold text-foreground mb-2">Thank you</h2>
            <p className="text-muted-foreground">Your submission has been added to the admin review queue. We will verify it before publishing any changes.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-8 space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">What are you submitting?</label>
              <div className="space-y-2">
                {TYPES.map(t => (
                  <label key={t.value} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="correction_type"
                      value={t.value}
                      checked={form.correction_type === t.value}
                      onChange={e => setForm({ ...form, correction_type: e.target.value })}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">{t.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Brand name (if relevant)</label>
              <input
                type="text"
                value={form.brand_name}
                onChange={e => setForm({ ...form, brand_name: e.target.value })}
                placeholder="e.g. Northern Playground"
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Your note or correction <span className="text-destructive">*</span></label>
              <textarea
                required
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                placeholder="Be as specific as possible. If correcting a claim, explain what is wrong and why."
                rows={5}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Source URL (optional)</label>
              <input
                type="url"
                value={form.submitted_source_url}
                onChange={e => setForm({ ...form, submitted_source_url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !form.note.trim()}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Submitting..." : "Submit for review"}
            </button>
          </form>
        )}

        {/* Account deletion */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Danger zone</p>
          <div className="bg-card border border-destructive/30 rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-foreground">Delete my account</p>
              <p className="text-xs text-muted-foreground mt-0.5">This will log you out and send a deletion request to our team.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors select-none"
                >
                  <Trash2 size={14} />
                  {deleting ? "Processing..." : "Delete account"}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will submit an account deletion request to our team and log you out immediately. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="mobile-bottom-spacer md:hidden" />
      </div>
    </div>
  );
}