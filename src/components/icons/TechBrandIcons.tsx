interface IconProps {
  className?: string;
  size?: number;
}

// 1. Rust official gear and 'R' logo
export function RustIcon({ className = 'text-orange-500', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 2" />
      <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M13 11h4.5a3 3 0 0 1 0 6H13v4m0-10v10m4.5-4L20 21"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 2. Flutter official layered wings logo
export function FlutterIcon({ className = 'text-cyan-500', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M19 4L6 17l4 4L27 4h-8z" fill="currentColor" fillOpacity="0.8" />
      <path d="M19 14l-6 6 6 6h8l-10-10 4-4-2-2z" fill="currentColor" />
      <path d="M13 20l4 4h8l-6-6-6 2z" fill="currentColor" fillOpacity="0.9" />
    </svg>
  );
}

// 3. Go (Golang) official logo
export function GoIcon({ className = 'text-teal-500', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M6 16c0-4.4 3.6-8 8-8 3.5 0 6.5 2.3 7.5 5.5h-4.5c-.7-1.2-2-2-3-2-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5c1.5 0 2.8-.8 3.5-2h-3.5v-3h7v6c-2 2.5-5 3.5-7 3.5-4.4 0-8-3.6-8-8z"
        fill="currentColor"
      />
      <circle cx="25" cy="16" r="2.5" fill="currentColor" />
    </svg>
  );
}

// 4. Node.js official hexagon & JS logo
export function NodeIcon({ className = 'text-emerald-500', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M16 4l11 6.35v12.7L16 29.4 5 23.05v-12.7L16 4z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M12 19.5V13l8 6.5V13"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 5. Python official dual interconnected snake logo
export function PythonIcon({ className = 'text-amber-500', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      {/* Upper snake */}
      <path
        d="M15.5 5c-5 0-5 2.5-5 2.5v3h5.5v1H7s-3 0-3 5 2.5 5 2.5 5h2v-2.5c0-2.5 2-2.5 2-2.5h5.5c2 0 3.5-1.5 3.5-3.5V7.5c0-2.5-4-2.5-4-2.5zm-2.2 1.8a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
        fill="#3b82f6"
      />
      {/* Lower snake */}
      <path
        d="M16.5 27c5 0 5-2.5 5-2.5v-3H16v-1h9s3 0 3-5-2.5-5-2.5-5h-2v2.5c0 2.5-2 2.5-2 2.5H16c-2 0-3.5 1.5-3.5 3.5v5.5c0 2.5 4 2.5 4 2.5zm2.2-1.8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"
        fill="#eab308"
      />
    </svg>
  );
}

// 6. Apple / Xcode official hammer & tools logo
export function XcodeIcon({ className = 'text-sky-500', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="5" y="5" width="22" height="22" rx="6" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
      <path
        d="M11 21l6-6m-2-4l4-4 3 3-4 4m-1 1l-2 2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 7l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 7. Java / Maven official coffee cup & steam logo
export function JavaIcon({ className = 'text-amber-600', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M8 15h13a1 1 0 0 1 1 1v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-4a1 1 0 0 1 1-1zm14 2h2a3 3 0 0 1 0 6h-2v-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7c0 2-2 3-2 5m5-5c0 2-2 3-2 5m5-5c0 2-2 3-2 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 8. PHP / Composer official oval badge
export function PhpIcon({ className = 'text-violet-500', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <ellipse cx="16" cy="16" rx="13" ry="8" stroke="currentColor" strokeWidth="2" />
      <path
        d="M9 13h2.5a1.5 1.5 0 0 1 0 3H9v3m7-6v6m0-3h2a1.5 1.5 0 0 1 0 3H16m6-6h2.5a1.5 1.5 0 0 1 0 3H22v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 9. Docker official whale logo
export function DockerIcon({ className = 'text-blue-500', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="7" y="11" width="3" height="3" fill="currentColor" rx="0.5" />
      <rect x="11" y="11" width="3" height="3" fill="currentColor" rx="0.5" />
      <rect x="15" y="11" width="3" height="3" fill="currentColor" rx="0.5" />
      <rect x="11" y="7" width="3" height="3" fill="currentColor" rx="0.5" />
      <rect x="15" y="7" width="3" height="3" fill="currentColor" rx="0.5" />
      <path
        d="M4 17c1.5 0 2.5 1 4 1s2.5-1 4-1 2.5 1 4 1 2.5-1 4-1 2.5 1 4 1c2-1 3-3 3-5 0 0-2 .5-3 0 0-2-1.5-3-3-3v1c-1 0-2-1-3-1v2H4c-1 3 0 6 0 6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 10. AI / Local LLM Neural / Ollama / Hugging Face icon
export function AiModelsIcon({ className = 'text-rose-500', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="7" y="7" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="13" r="2" fill="currentColor" />
      <circle cx="20" cy="13" r="2" fill="currentColor" />
      <path d="M12 20c1.5 1.5 6.5 1.5 8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3v4m0 18v4m-13-11h4m18 0h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 11. Ruby official faceted gemstone
export function RubyIcon({ className = 'text-red-500', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M8 7l16 0 5 8-13 13-13-13z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 7l5 8-5 13m16-21l-5 8 5 13M8 7l8 8 8-8m-16 8h16"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 12. .NET official logo
export function DotNetIcon({ className = 'text-purple-500', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="21" r="1.5" fill="currentColor" />
      <path
        d="M13 22V10l7 12V10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 13. C / C++ official logo
export function CppIcon({ className = 'text-blue-600', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M16 5l10 5.8v11.6L16 28.2 6 22.4V10.8L16 5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M14 13a4 4 0 1 0 0 6m5-5v4m-2-2h4m3-2v4m-2-2h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 14. Universal package cache icon
export function PackageCacheIcon({ className = 'text-indigo-500', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M5 9l11-5 11 5v14l-11 5-11-5V9z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M5 9l11 5 11-5m-11 5v14" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
