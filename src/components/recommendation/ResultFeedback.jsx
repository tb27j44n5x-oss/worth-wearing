import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ThumbsUp, ThumbsDown, MessageSquare, Send } from "lucide-react";

export default function ResultFeedback({ query, recommendationSetId }) {
  const [vote, setVote] = useState(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [user, setUser] = useState(null);
  const [counts, setCounts] = useState({ up: 0, down: 0 });

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) base44.auth.me().then(setUser).catch(() => {});
    });
    // Load existing vote counts
    base44.entities.ResultFeedback.filter({ query }).then(feedbacks => {
      const up = feedbacks.filter(f => f.vote === "up").length;
      const down = feedbacks.filter(f => f.vote === "down").length;
      setCounts({ up, down });
    }).catch(() => {});
  }, [query]);

  const handleVote = async (v) => {
    if (done || submitting) return;
    setVote(v);
    // Only submit immediately if comment box is not open
    // If comment box opens later, submission happens via handleSubmitWithComment
    if (!showComment) {
      await submitFeedback(v, "");
    }
  };

  const submitFeedback = async (v, c) => {
    setSubmitting(true);
    await base44.entities.ResultFeedback.create({
      query,
      recommendation_set_id: recommendationSetId || "",
      vote: v,
      comment: c || "",
      submitter_email: user?.email || "",
      is_anonymous: !user,
    });
    setCounts(prev => ({ ...prev, [v]: prev[v] + 1 }));
    setDone(true);
    setSubmitting(false);
  };

  const handleSubmitWithComment = async () => {
    if (!vote) return;
    await submitFeedback(vote, comment);
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-emerald-600">✓</span> Thanks for your feedback!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Was this recommendation helpful?</p>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => handleVote("up")}
          disabled={submitting}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
            vote === "up" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-card border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <ThumbsUp size={14} /> Helpful {counts.up > 0 && <span className="text-xs opacity-60">({counts.up})</span>}
        </button>
        <button
          onClick={() => handleVote("down")}
          disabled={submitting}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
            vote === "down" ? "bg-red-50 border-red-300 text-red-700" : "bg-card border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <ThumbsDown size={14} /> Not helpful {counts.down > 0 && <span className="text-xs opacity-60">({counts.down})</span>}
        </button>
        {vote && !done && (
          <button
            onClick={() => setShowComment(c => !c)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquare size={13} /> {user ? "Add a comment" : "Login to comment"}
          </button>
        )}
      </div>

      {showComment && user && vote && (
        <div className="flex gap-2">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="What was wrong or missing? (optional)"
            rows={2}
            className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <button
            onClick={handleSubmitWithComment}
            disabled={submitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <Send size={13} />
          </button>
        </div>
      )}

      {showComment && !user && (
        <p className="text-xs text-muted-foreground">
          <button onClick={() => base44.auth.redirectToLogin()} className="text-primary underline underline-offset-2">Log in</button> to leave a comment.
        </p>
      )}
    </div>
  );
}