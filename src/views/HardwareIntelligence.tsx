import { useState, useEffect } from 'react';
import {
  Battery,
  BatteryCharging,
  Cpu,
  Flame,
  Zap,
  RefreshCw,
  ShieldCheck,
  XCircle,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import {
  getHardwareIntelligence,
  killProcessByPid,
  HardwareReport,
} from '../lib/commands';
import { formatSize } from '../lib/utils';

export default function HardwareIntelligence() {
  const [report, setReport] = useState<HardwareReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [killingPid, setKillingPid] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchHardware = async () => {
    try {
      const data = await getHardwareIntelligence();
      setReport(data);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHardware();
    const interval = setInterval(fetchHardware, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleKill = async (pid: number, name: string) => {
    if (killingPid !== null) return;
    setKillingPid(pid);
    setFeedback(null);
    try {
      const res = await killProcessByPid(pid);
      if (res.success) {
        setFeedback(`Terminated ${name} (PID ${pid})`);
        setTimeout(() => setFeedback(null), 3500);
        await fetchHardware();
      } else {
        setFeedback(`Could not terminate ${name}: ${res.message}`);
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch {
      setFeedback(`Failed to stop process ${name}`);
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setKillingPid(null);
    }
  };

  if (isLoading && !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-emerald-500" />
        <p className="text-sm font-medium">Reading Mac hardware sensors & battery telemetry...</p>
      </div>
    );
  }

  const batt = report?.battery;
  const therm = report?.thermal;
  const hogs = report?.energy_hogs || [];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-emerald-500" />
            Hardware & Battery Intelligence
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
            Deep Apple Silicon hardware telemetry, battery condition, thermal state, and energy hog detection.
          </p>
        </div>
        <button
          onClick={fetchHardware}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Sensors
        </button>
      </div>

      {feedback && (
        <div className="py-2.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {feedback}
        </div>
      )}

      {/* Grid 1: Battery & Thermal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Battery Telemetry Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {batt?.is_charging ? <BatteryCharging className="w-5 h-5" /> : <Battery className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Battery Telemetry
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    {batt?.has_battery ? 'Built-in Apple Smart Battery' : 'Desktop Mac (AC Power Only)'}
                  </p>
                </div>
              </div>
              {batt?.has_battery && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    batt.health_percentage >= 80
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {batt.condition}
                </span>
              )}
            </div>

            {batt?.has_battery ? (
              <div className="space-y-4">
                {/* Health percentage big stat */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-neutral-400">Maximum Capacity (Health)</span>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
                      {batt.health_percentage}%
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Original design capacity retention
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 dark:text-neutral-400">Current Level</span>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                      {batt.current_percentage}%
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {batt.is_plugged_in ? (batt.is_charging ? 'Charging' : 'Fully Charged / On AC') : 'On Battery'}
                    </span>
                  </div>
                </div>

                {/* Battery detail specs */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <span className="text-slate-400 text-[11px]">Cycle Count</span>
                    <div className="text-sm font-semibold font-mono text-slate-900 dark:text-white mt-0.5">
                      {batt.cycle_count} / 1000
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, (batt.cycle_count / 1000) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <span className="text-slate-400 text-[11px]">Charger Adapter</span>
                    <div className="text-sm font-semibold font-mono text-slate-900 dark:text-white mt-0.5">
                      {batt.charger_watts ? `${batt.charger_watts}W USB-C Adapter` : (batt.is_plugged_in ? 'Connected' : 'Disconnected')}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {batt.is_plugged_in ? 'Supplying Wall Power' : 'Running on Cells'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <span className="text-slate-400 text-[11px]">Design Capacity</span>
                    <div className="text-sm font-semibold font-mono text-slate-900 dark:text-white mt-0.5">
                      {batt.design_capacity ? `${batt.design_capacity} mAh` : '--'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <span className="text-slate-400 text-[11px]">Nominal Capacity</span>
                    <div className="text-sm font-semibold font-mono text-slate-900 dark:text-white mt-0.5">
                      {batt.nominal_capacity ? `${batt.nominal_capacity} mAh` : '--'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-white/5 rounded-xl">
                <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Continuous AC Power</p>
                <p className="text-xs text-slate-500 mt-1">This Mac is a desktop workstation and does not use battery storage.</p>
              </div>
            )}
          </div>
        </div>

        {/* Thermal & Processor Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Thermal & Processor State
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    {therm?.cpu_brand || 'Apple Silicon'}
                  </p>
                </div>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  therm?.is_throttled
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {therm?.thermal_state || 'Normal'}
              </span>
            </div>

            <div className="space-y-4">
              {/* CPU Load Metric */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-blue-500" />
                    Processor Load ({therm?.core_count || 8} Cores)
                  </span>
                  <span className="font-semibold font-mono text-slate-900 dark:text-white text-sm">
                    {therm?.cpu_usage || 0}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      (therm?.cpu_usage || 0) > 80 ? 'bg-rose-500' : (therm?.cpu_usage || 0) > 50 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, therm?.cpu_usage || 0))}%` }}
                  />
                </div>
              </div>

              {/* Speed limit and Throttling status */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <span className="text-slate-400 text-[11px]">CPU Speed Limit</span>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {therm?.cpu_speed_limit || 100}%
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {therm?.is_throttled ? 'Performance Throttled' : 'Running at Full Frequency'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <span className="text-slate-400 text-[11px]">Thermal Pressure</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {therm?.thermal_state || 'Nominal'}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Fan & heatsink dissipation safe
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Energy Hog Hunter */}
      <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Energy Hog Hunter
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Top processes consuming battery power and CPU cycles in the background.
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400">Auto-refreshed every 3.5s</span>
        </div>

        {hogs.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No Energy Hogs Detected</p>
            <p className="text-xs text-slate-500 mt-1">All background processes are behaving efficiently.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {hogs.map((hog) => (
              <div key={hog.pid} className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 px-2 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 font-mono text-xs font-bold">
                    {hog.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      {hog.name}
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-neutral-400">
                        PID: {hog.pid}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>Memory: {formatSize(hog.memory_bytes)}</span>
                      <span>&bull;</span>
                      <span className="font-semibold text-rose-500 dark:text-rose-400">
                        CPU: {hog.cpu_usage}%
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleKill(hog.pid, hog.name)}
                  disabled={killingPid === hog.pid}
                  className="px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {killingPid === hog.pid ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  Stop Process
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
