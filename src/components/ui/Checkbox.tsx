import { Check, Minus } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export default function Checkbox({
  checked,
  indeterminate = false,
  disabled = false,
  onChange,
  label,
  className = '',
}: CheckboxProps) {
  return (
    <label
      className={`inline-flex items-center gap-2.5 select-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      <button
        type="button"
        role="checkbox"
        disabled={disabled}
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-label={label || 'Select item'}
        onClick={() => {
          if (!disabled) {
            onChange(!checked);
          }
        }}
        className={`
          w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center
          transition-all duration-150 shrink-0
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:outline-none
          ${
            checked || indeterminate
              ? 'bg-accent border-accent text-white'
              : 'border-slate-300 dark:border-neutral-600 hover:border-accent'
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

