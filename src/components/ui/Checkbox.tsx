import { Check, Minus } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export default function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
  className = '',
}: CheckboxProps) {
  return (
    <label className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${className}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-label={label || 'Select item'}
        onClick={() => onChange(!checked)}
        className={`
          w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center
          transition-all duration-150 shrink-0 cursor-pointer
          focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none
          ${
            checked || indeterminate
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-slate-300 dark:border-neutral-600 hover:border-blue-400 dark:hover:border-blue-500'
          }
        `}
      >
        {checked && <Check size={12} strokeWidth={3} />}
        {indeterminate && !checked && <Minus size={12} strokeWidth={3} />}
      </button>
      {label && (
        <span className="text-sm text-slate-700 dark:text-neutral-300">{label}</span>
      )}
    </label>
  );
}
