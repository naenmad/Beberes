import { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n';
import {
  Battery,
  BatteryCharging,
  Cpu,
  Flame,
  Zap,
  RefreshCw,
  ShieldCheck,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import {
  getHardwareIntelligence,
  killProcessByPid,
  HardwareReport,
} from '../lib/commands';
import { formatSize } from '../lib/utils';
import Button from '../components/ui/Button';
import PageHeader from '../components/layout/PageHeader';
import { CardSkeleton } from '../components/ui/SkeletonLoader';

export default function HardwareIntelligence() {
  const { t } = useTranslation();
  const [report, setReport] = useState<HardwareReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [killingPid, setKillingPid] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchHardware = async () => {
    try {
      const data = await getHardwareIntelligence();
      setReport(data);
    } catch (e) {
      console.error('Failed to fetch hardware intelligence:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHardware();
    const interval = setInterval(fetchHardware, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleKill = async (pid: number, name: string) => {
    if (killingPid !== null) return;
    setKillingPid(pid);
    setFeedback(null);
    try {
      const res = await killProcessByPid(pid);
      if (res.success) {
        setFeedback(`${t('hardware.processStopped', 'Process stopped successfully')}: ${name}`);
        setTimeout(() => setFeedback(null), 3500);
        await fetchHardware();
      } else {
        setFeedback(`Could not stop ${name}: ${res.message}`);
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch {
      setFeedback(`Failed to stop process ${name}`);
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setKillingPid(null);
    }
  };

  const batt = report?.battery;
  const therm = report?.thermal;
  const hogs = report?.energy_hogs || [];

  return (
    <div className="space-y-6 pb-20">
      {/* Standard Beberes PageHeader */}
      <PageHeader
        icon={<Activity size={20} />}
        title={t('hardware.title', 'Hardware & Battery Intelligence')}
        subtitle={t(
          'hardware.subtitle',
          'Apple Silicon telemetry, battery condition, thermal state, and background process monitor.'
        )}
        actions={
          <Button
            onClick={fetchHardware}
            loading={isLoading && !report}
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
          >
            {t('hardware.refresh', 'Refresh Sensors')}
          </Button>
        }
      />

      {feedback && (
        <div className="py-2.5 px-4 rounded-2xl bg-accent-subtle border border-accent/20 text-accent text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} />
          {feedback}
        </div>
      )}

      {isLoading && !report ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          {/* Top Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Battery Health & Power */}
            <div className="p-5 rounded-3xl glass-panel flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
                    {batt?.is_charging ? <BatteryCharging size={20} /> : <Battery size={20} />}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                      {t('hardware.batteryHealth', 'Battery Health & Charge')}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {batt?.has_battery ? `${batt.health_percentage}%` : t('hardware.desktopMac', 'Desktop Mac')}
                    </h3>
                  </div>
                </div>

                {batt?.has_battery && (
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                      batt.health_percentage >= 80
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {batt.condition}
                  </span>
                )}
              </div>

              {batt?.has_battery ? (
                <div className="space-y-2 pt-2 border-t border-black/4 dark:border-white/6 text-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
                    <span>{t('hardware.cycleCount', 'Cycle Count')}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-neutral-200">
                      {batt.cycle_count} / 1000
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${Math.min(100, (batt.cycle_count / 1000) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 pt-1">
                    <span>{t('hardware.charger', 'Charger')}</span>
                    <span className="font-semibold text-slate-800 dark:text-neutral-200">
                      {batt.charger_watts ? `${batt.charger_watts}W USB-C Adapter` : 'Battery Power'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-neutral-400 pt-2 border-t border-black/4 dark:border-white/6">
                  {t('hardware.desktopMac', 'Continuous AC Power Supply')}
                </p>
              )}
            </div>

            {/* 2. Thermal State & Throttling */}
            <div className="p-5 rounded-3xl glass-panel flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Flame size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                      {t('hardware.thermalCondition', 'Thermal Condition')}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {therm?.thermal_state || 'Nominal'}
                    </h3>
                  </div>
                </div>

                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {therm?.cpu_speed_limit === 100
                    ? t('hardware.normalThermal', 'No Throttling')
                    : `${therm?.cpu_speed_limit}% Limit`}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-black/4 dark:border-white/6 text-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
                  <span>{t('hardware.cpuModel', 'Processor')}</span>
                  <span className="font-bold text-slate-800 dark:text-neutral-200">
                    {therm?.cpu_brand || 'Apple Silicon'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
                  <span>{t('hardware.cpuSpeedLimit', 'CPU Speed Limit')}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-neutral-200">
                    {therm?.cpu_speed_limit}%
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Silicon Architecture & Cores */}
            <div className="p-5 rounded-3xl glass-panel flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-secondary-subtle text-secondary-accent flex items-center justify-center shrink-0">
                    <Cpu size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                      {t('hardware.powerMode', 'SoC Configuration')}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {therm ? `${therm.core_count} Cores` : 'Apple Silicon'}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck size={16} />
                  <span>ARM64</span>
                </div>
              </div>

              <div className="pt-2 border-t border-black/4 dark:border-white/6 text-xs text-slate-500 dark:text-neutral-400 flex items-center justify-between">
                <span>Architecture</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-neutral-200">
                  Apple Unified Memory
                </span>
              </div>
            </div>
          </div>

          {/* Energy & Process Hog Monitor */}
          <div className="p-5 rounded-3xl glass-panel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/4 dark:border-white/6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <Zap size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('hardware.energyHogsTitle', 'Energy & CPU Hog Monitor')}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    {t(
                      'hardware.energyHogsDesc',
                      'Background processes consuming excessive processor cycles or power.'
                    )}
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-xl bg-black/4 dark:bg-white/8 text-slate-600 dark:text-neutral-300">
                {hogs.length} processes
              </span>
            </div>

            {hogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  {t('hardware.noHogs', 'No heavy background processes detected.')}
                </p>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  All active tasks are operating within normal energy thresholds.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {hogs.map((proc) => (
                  <div
                    key={proc.pid}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl glass-panel hover:border-black/10 dark:hover:border-white/12 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-slate-400 px-2 py-0.5 rounded-lg bg-black/4 dark:bg-white/8 shrink-0">
                        {proc.pid}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {proc.name}
                        </h4>
                        <span className="text-xs text-slate-400">
                          Memory: {formatSize(proc.memory_bytes)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-accent">
                          {proc.cpu_usage.toFixed(1)}% CPU
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        loading={killingPid === proc.pid}
                        onClick={() => handleKill(proc.pid, proc.name)}
                        className="text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold px-3 py-1.5 rounded-xl border border-rose-500/20"
                      >
                        {t('hardware.stopProcess', 'Stop Process')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
