import { ShoppingBag, ExternalLink, Lightbulb } from "lucide-react";

export default function SecondHandSection({ result }) {
  const hasLinks = result.second_hand_links?.length > 0;
  const hasAdvice = result.second_hand_advice;

  if (!hasLinks && !hasAdvice) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-playfair text-2xl font-semibold text-foreground">Buying second-hand</h2>
        <p className="text-sm text-muted-foreground mt-1">Often the most sustainable — and cheapest — option.</p>
      </div>

      {/* Practical advice */}
      {hasAdvice && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <Lightbulb size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-relaxed">{result.second_hand_advice}</p>
        </div>
      )}

      {/* Marketplace links */}
      {hasLinks && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {result.second_hand_links.map((link, i) => (
            <a
              key={i}
              href={link.search_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-card border border-border hover:border-amber-300 hover:shadow-sm rounded-xl px-4 py-3 transition-all group"
            >
              <ShoppingBag size={14} className="text-amber-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground group-hover:text-amber-700 transition-colors truncate">{link.platform}</p>
                {link.note && <p className="text-xs text-muted-foreground truncate">{link.note}</p>}
              </div>
              <ExternalLink size={12} className="text-muted-foreground flex-shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}