/**
 * TouchButton: Mobile-optimized button with better touch targets (48px min)
 */
export default function TouchButton({ children, className = '', variant = 'primary', disabled = false, ...props }) {
  const baseClasses = 'px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 active:scale-95 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40',
    secondary: 'bg-secondary border border-secondary text-primary hover:bg-secondary/80 disabled:opacity-40',
    ghost: 'text-muted-foreground hover:text-foreground disabled:opacity-40',
  };

  return (
    <button
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}