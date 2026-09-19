import { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  Copy,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import {
  exportReportMarkdown,
  getSystemDetails,
  getMemoryStatus,
  getHardwareIntelligence,
  SystemDetails,
  MemoryStatus,
  HardwareReport,
} from '../lib/commands';
import { formatSize } from '../lib/utils';
import { useAppStore, APP_VERSION } from '../store/appStore';
import Button from './ui/Button';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const { diskInfo, lifetimeBytesFreed, cleanHistory } = useAppStore();
  const [sysDetails, setSysDetails] = useState<SystemDetails | null>(null);
  const [memory, setMemory] = useState<MemoryStatus | null>(null);
  const [hardware, setHardware] = useState<HardwareReport | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getSystemDetails().then(setSysDetails).catch(() => {});
      getMemoryStatus().then(setMemory).catch(() => {});
      getHardwareIntelligence().then(setHardware).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalItemsCleaned = cleanHistory.reduce((s, e) => s + (e.itemsCount || 0), 0);
  const dateStr = new Date().toLocaleString();

  const markdownContent = `# Beberes System Health & Audit Report
**Generated on:** ${dateStr}
**Application:** Beberes v${APP_VERSION} (Native macOS Optimizer)

---

## 1. System & Device Specifications
- **Operating System:** ${sysDetails ? `${sysDetails.osName} ${sysDetails.osVersion}` : 'macOS'}
- **Host / Kernel:** ${sysDetails ? `${sysDetails.hostname} (Kernel ${sysDetails.kernelVersion})` : 'Apple Silicon'}
- **Processor:** ${hardware ? `${hardware.thermal.cpu_brand} (${hardware.thermal.core_count} Cores)` : 'Apple Silicon'}
- **Thermal Status:** ${hardware ? hardware.thermal.thermal_state : 'Normal'}
- **CPU Speed Limit:** ${hardware ? `${hardware.thermal.cpu_speed_limit}%` : '100%'}

## 2. Storage & Memory Status
- **Disk Capacity:** ${diskInfo ? `${formatSize(diskInfo.freeSpace)} Free of ${formatSize(diskInfo.totalSpace)}` : '--'}
- **Disk Utilization:** ${diskInfo ? `${Math.round((diskInfo.usedSpace / diskInfo.totalSpace) * 100)}%` : '--'}
- **Unified Memory:** ${memory ? `${formatSize(memory.used_bytes)} / ${formatSize(memory.total_bytes)} (${memory.used_percentage}%)` : '--'}
- **Purgeable / Inactive RAM:** ${memory ? formatSize(memory.inactive_bytes + memory.purgeable_bytes) : '--'}

## 3. Battery & Power Telemetry
${
  hardware?.battery.has_battery
    ? `- **Battery Health (Max Capacity):** ${hardware.battery.health_percentage}%
- **Cycle Count:** ${hardware.battery.cycle_count} / 1000
- **Condition:** ${hardware.battery.condition}
- **Charger Status:** ${hardware.battery.charger_watts ? `${hardware.battery.charger_watts}W Adapter Connected` : 'Battery Power'}`
    : `- **Power Type:** Continuous AC Power (Desktop Mac)`
}

## 4. Lifetime Maintenance Summary
- **Total Storage Reclaimed:** ${formatSize(lifetimeBytesFreed)}
- **Total Junk Items Cleaned:** ${totalItemsCleaned.toLocaleString()}
- **Cleaning History Entries:** ${cleanHistory.length}

---
*Report generated locally by Beberes. Zero telemetry, 100% private.*
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveMarkdown = async () => {
    setIsExporting(true);
    setSavedPath(null);
    try {
      const path = await exportReportMarkdown(markdownContent);
      setSavedPath(path);
      setTimeout(() => setSavedPath(null), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Mac System Health & Audit Report
              </h2>
              <p className="text-xs text-slate-400">
                Generated {dateStr}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {savedPath && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              Saved & revealed in Finder: {savedPath}
            </div>
          )}

          {/* Report Card Preview */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  Beberes macOS Audit
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                  v{APP_VERSION}
                </span>
              </div>
              <span className="text-slate-400 text-[11px]">{dateStr}</span>
            </div>

            {/* Grid Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5">
                <span className="text-slate-400 text-[10px] block">Disk Free</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                  {diskInfo ? formatSize(diskInfo.freeSpace) : '--'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5">
                <span className="text-slate-400 text-[10px] block">Unified Memory</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                  {memory ? `${memory.used_percentage}%` : '--'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5">
                <span className="text-slate-400 text-[10px] block">Battery Health</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                  {hardware?.battery.has_battery ? `${hardware.battery.health_percentage}%` : 'AC Power'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5">
                <span className="text-slate-400 text-[10px] block">Lifetime Reclaimed</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                  {formatSize(lifetimeBytesFreed)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5">
                <span className="text-slate-400 text-[10px] block">Items Cleaned</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                  {totalItemsCleaned.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5">
                <span className="text-slate-400 text-[10px] block">Thermal Pressure</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {hardware?.thermal.thermal_state || 'Nominal'}
                </span>
              </div>
            </div>

            {/* Markdown Text Area Preview */}
            <div>
              <span className="text-slate-400 text-[11px] font-semibold block mb-1">
                Markdown Output Format
              </span>
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-48 select-all">
                {markdownContent}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCopy}
              variant="secondary"
              size="sm"
              icon={copied ? <Check size={13} /> : <Copy size={13} />}
            >
              {copied ? 'Copied!' : 'Copy Markdown'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              variant="secondary"
              size="sm"
              icon={<Printer size={13} />}
            >
              Print / PDF
            </Button>
            <Button
              onClick={handleSaveMarkdown}
              loading={isExporting}
              variant="primary"
              size="sm"
              icon={<Download size={13} />}
            >
              Save Report (.md)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
