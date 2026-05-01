import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function MobileHeader({ title, onBack }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border flex items-center px-4 py-3 md:hidden">
      <button
        onClick={handleBack}
        className="flex items-center gap-1 text-primary font-medium text-sm select-none -ml-1"
      >
        <ChevronLeft size={20} strokeWidth={2} />
        Back
      </button>
      {title && (
        <span className="absolute left-1/2 -translate-x-1/2 font-semibold text-sm text-foreground truncate max-w-[55%]">
          {title}
        </span>
      )}
    </div>
  );
}