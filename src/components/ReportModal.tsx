import { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n';
import {
  FileText,
  Printer,
  Download,
  Copy,
  Check,
  X,
  Sparkles,
  Cpu,
  HardDrive,
  Battery,
  CheckCircle2,
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
  const { t } = useTranslation();
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
      setTimeout(() => setSavedPath(null), 4000);
    } catch {
      // Ignored
    } finally {
      setIsExporting(false);
    }
  };

  const diskUsedPct = diskInfo
    ? Math.round((diskInfo.usedSpace / diskInfo.totalSpace) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in font-sans">
      <div className="w-full max-w-2xl max-h-[88vh] rounded-3xl glass-panel border border-black/10 dark:border-white/15 shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* Modal Header */}
        <div className="p-5 border-b border-black/4 dark:border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t('report.title', 'Mac System Health & Audit Report')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Generated locally &bull; Beberes v{APP_VERSION}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs">
          {savedPath && (
            <div className="py-2.5 px-4 rounded-2xl bg-accent-subtle border border-accent/20 text-accent text-xs font-medium flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={15} />
              {t('report.savedToDesktop', 'Report exported to Desktop')}: {savedPath}
            </div>
          )}

          {/* Section 1: Device & Chipset */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Cpu size={14} className="text-accent" />
              <span>{t('report.deviceSpecs', 'Device & Chipset')}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/2 dark:bg-white/4 border border-black/4 dark:border-white/6">
              <div>
                <span className="text-slate-400 text-[11px]">macOS</span>
                <p className="font-semibold text-slate-800 dark:text-neutral-200">
                  {sysDetails ? `${sysDetails.osName} ${sysDetails.osVersion}` : 'macOS'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Processor</span>
                <p className="font-semibold text-slate-800 dark:text-neutral-200">
                  {hardware?.thermal.cpu_brand || 'Apple Silicon'} ({hardware?.thermal.core_count || 8} Cores)
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Hostname</span>
                <p className="font-mono text-slate-800 dark:text-neutral-200 truncate">
                  {sysDetails?.hostname || 'MacBook'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Thermal State</span>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {hardware?.thermal.thermal_state || 'Nominal'} (Speed {hardware?.thermal.cpu_speed_limit || 100}%)
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Storage & Memory */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <HardDrive size={14} className="text-secondary-accent" />
              <span>{t('report.storageMemory', 'Storage & Memory')}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/2 dark:bg-white/4 border border-black/4 dark:border-white/6">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>SSD Utilization</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-neutral-200">{diskUsedPct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${diskUsedPct}%` }} />
                </div>
                <span className="text-[10px] text-slate-400">
                  {diskInfo ? `${formatSize(diskInfo.freeSpace)} Free of ${formatSize(diskInfo.totalSpace)}` : '--'}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Unified Memory</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-neutral-200">
                    {memory ? `${memory.used_percentage}%` : '--'}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-secondary-accent rounded-full"
                    style={{ width: `${memory?.used_percentage || 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">
                  {memory ? `${formatSize(memory.used_bytes)} / ${formatSize(memory.total_bytes)}` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Battery & Power */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Battery size={14} className="text-emerald-500" />
              <span>{t('report.batteryPower', 'Battery & Power')}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/2 dark:bg-white/4 border border-black/4 dark:border-white/6 flex items-center justify-between">
              {hardware?.battery.has_battery ? (
                <>
                  <div>
                    <span className="text-slate-400 text-[11px]">Maximum Capacity</span>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      {hardware.battery.health_percentage}% ({hardware.battery.condition})
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Cycle Count</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-neutral-200">
                      {hardware.battery.cycle_count} / 1000
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Power Source</span>
                    <p className="font-semibold text-slate-800 dark:text-neutral-200">
                      {hardware.battery.charger_watts ? `${hardware.battery.charger_watts}W Adapter` : 'Battery'}
                    </p>
                  </div>
                </>
              ) : (
                <span className="text-slate-500">Continuous AC Power Supply (Desktop Mac)</span>
              )}
            </div>
          </div>

          {/* Section 4: Lifetime Maintenance */}
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                {t('report.maintenanceRecord', 'Lifetime Maintenance')}
              </span>
              <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatSize(lifetimeBytesFreed)}
              </p>
              <span className="text-[11px] text-slate-400">
                Reclaimed across {cleanHistory.length} sessions ({totalItemsCleaned.toLocaleString()} items cleaned)
              </span>
            </div>
            <Sparkles size={32} className="text-emerald-500/40" />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-black/4 dark:border-white/6 flex items-center justify-between bg-black/2 dark:bg-white/2">
          <Button
            variant="ghost"
            size="sm"
            icon={copied ? <Check size={13} /> : <Copy size={13} />}
            onClick={handleCopy}
          >
            {copied ? t('report.copied', 'Copied') : t('report.copyMarkdown', 'Copy Markdown')}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Printer size={13} />}
              onClick={() => window.print()}
            >
              {t('report.printPdf', 'Print / PDF')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isExporting}
              icon={<Download size={13} />}
              onClick={handleSaveMarkdown}
            >
              {t('report.saveMarkdown', 'Export to Desktop')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
