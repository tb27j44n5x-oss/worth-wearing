import { Leaf, Hammer, Truck, Shirt, RotateCcw } from "lucide-react";

const STAGES = [
  { key: "raw_material", label: "Raw Material", icon: Leaf, color: "text-emerald-600" },
  { key: "manufacturing", label: "Manufacturing", icon: Hammer, color: "text-blue-600" },
  { key: "transport", label: "Transport", icon: Truck, color: "text-amber-600" },
  { key: "use_durability", label: "Use & Durability", icon: Shirt, color: "text-purple-600" },
  { key: "end_of_life", label: "End of Life", icon: RotateCcw, color: "text-cyan-600" },
];

export default function LifecycleStages({ lifecycleData }) {
  if (!lifecycleData) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-syne text-2xl font-semibold text-foreground">Sustainability Lifecycle</h2>
        <p className="text-sm text-muted-foreground mt-1">Impact across each stage of the product's life.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {STAGES.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 bg-muted rounded-lg flex items-center justify-center ${color}`}>
                <Icon size={16} />
              </div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</p>
            </div>
            {lifecycleData[key] ? (
              <p className="text-xs text-muted-foreground leading-relaxed">{lifecycleData[key]}</p>
            ) : (
              <p className="text-xs text-muted-foreground italic">No data available</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}