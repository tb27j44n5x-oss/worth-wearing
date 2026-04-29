const gradeColors = {
  "A+": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "A":  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "A-": "bg-green-100 text-green-800 border-green-200",
  "B+": "bg-lime-100 text-lime-800 border-lime-200",
  "B":  "bg-lime-100 text-lime-800 border-lime-200",
  "B-": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "C+": "bg-amber-100 text-amber-800 border-amber-200",
  "C":  "bg-amber-100 text-amber-800 border-amber-200",
  "C-": "bg-orange-100 text-orange-800 border-orange-200",
  "D":  "bg-red-100 text-red-800 border-red-200",
  "F":  "bg-red-200 text-red-900 border-red-300",
};

export default function GradeBadge({ grade, size = "md" }) {
  const sizeClass = size === "lg" ? "w-16 h-16 text-2xl font-bold" : size === "sm" ? "w-8 h-8 text-sm font-semibold" : "w-12 h-12 text-lg font-bold";
  const color = gradeColors[grade] || "bg-muted text-muted-foreground border-border";
  return (
    <div className={`${sizeClass} ${color} border-2 rounded-xl flex items-center justify-center font-playfair`}>
      {grade || "?"}
    </div>
  );
}