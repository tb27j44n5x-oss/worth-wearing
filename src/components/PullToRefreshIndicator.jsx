import { RefreshCw } from "lucide-react";

export default function PullToRefreshIndicator({ pullY, isTriggered }) {
  if (!pullY) return null;
  return (
    <div
      className="flex items-center justify-center text-muted-foreground transition-all"
      style={{ height: pullY, overflow: "hidden" }}
    >
      <RefreshCw
        size={18}
        className={isTriggered ? "text-primary animate-spin" : "text-muted-foreground"}
        style={{ transform: `rotate(${(pullY / 72) * 360}deg)` }}
      />
      <span className="ml-2 text-xs">
        {isTriggered ? "Release to refresh" : "Pull to refresh"}
      </span>
    </div>
  );
}