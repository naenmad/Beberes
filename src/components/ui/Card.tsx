import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
}

export default function Card({ children, className = '', style, onClick, hoverable = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`
        bg-white dark:bg-neutral-800 rounded-2xl border border-slate-100 dark:border-neutral-700
        ${hoverable ? 'hover:border-slate-200 dark:hover:border-neutral-600 hover:shadow-md transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}


interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`px-5 py-4 border-b border-slate-50 dark:border-neutral-700/50 ${className}`}>
      {children}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}
