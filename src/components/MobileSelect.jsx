import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Wrapper that replaces native <select> with Radix UI Select.
 * Props mirror a native select: value, onChange (receives value string), options [{value, label}], className.
 */
export default function MobileSelect({ value, onChange, options, className = "" }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`bg-muted border-border text-foreground text-sm rounded-xl ${className}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}