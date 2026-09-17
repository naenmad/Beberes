import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { pickFolder } from '../lib/commands';
import { formatSize } from '../lib/utils';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  Shield,
  FolderPlus,
  X,
  Plus,
  AlertTriangle,
  FolderOpen,
  History,
  Trash2,
} from 'lucide-react';

export default function Settings() {
  const {
    whitelistPaths,
    customScanPaths,
    addWhitelistPath,
    removeWhitelistPath,
    addCustomScanPath,
    removeCustomScanPath,
    lifetimeBytesFreed,
    cleanHistory,
    clearCleanHistory,
  } = useAppStore();

  const [newWhitelistPath, setNewWhitelistPath] = useState('');
  const [newCustomPath, setNewCustomPath] = useState('');

  const handleAddWhitelist = () => {
    const trimmed = newWhitelistPath.trim();
    if (trimmed && !whitelistPaths.includes(trimmed)) {
      addWhitelistPath(trimmed);
      setNewWhitelistPath('');
    }
  };

  const handleBrowseWhitelist = async () => {
    const chosen = await pickFolder();
    if (chosen) {
      setNewWhitelistPath(chosen);
    }
  };

  const handleAddCustom = () => {
    const trimmed = newCustomPath.trim();
    if (trimmed && !customScanPaths.includes(trimmed)) {
      addCustomScanPath(trimmed);
      setNewCustomPath('');
    }
  };

  const handleBrowseCustom = async () => {
    const chosen = await pickFolder();
    if (chosen) {
      setNewCustomPath(chosen);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl pb-10">
      {/* Whitelist */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <Shield size={20} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                Protected Paths (Whitelist)
              </h3>
              <p className="text-xs text-slate-400 dark:text-neutral-500">
                These directories will never be deleted during cleanup
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            {whitelistPaths.map((path) => (
              <div
                key={path}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-neutral-700/30 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                  <span className="text-sm text-slate-600 dark:text-neutral-300 truncate font-mono">
                    {path}
                  </span>
                </div>
                {/* Don't allow removing system-critical paths */}
                {!['/System', '/Library/CoreServices', '/usr', '/bin', '/sbin'].includes(path) && (
                  <button
                    onClick={() => removeWhitelistPath(path)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-neutral-600 transition-all duration-150 cursor-pointer"
                  >
                    <X size={14} className="text-slate-400" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newWhitelistPath}
              onChange={(e) => setNewWhitelistPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddWhitelist()}
              placeholder="/path/to/protect"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            <Button
              variant="secondary"
              onClick={handleBrowseWhitelist}
              size="sm"
              icon={<FolderOpen size={14} />}
            >
              Browse
            </Button>
            <Button onClick={handleAddWhitelist} size="sm" icon={<Plus size={14} />}>
              Add
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Custom Scan Paths */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <FolderPlus size={20} className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                Custom Scan Directories
              </h3>
              <p className="text-xs text-slate-400 dark:text-neutral-500">
                Add extra directories (e.g. Downloads, Video Projects) to analyze
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {customScanPaths.length > 0 ? (
            <div className="space-y-2 mb-3">
              {customScanPaths.map((path) => (
                <div
                  key={path}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-neutral-700/30 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen size={14} className="text-blue-400 shrink-0" />
                    <span className="text-sm text-slate-600 dark:text-neutral-300 truncate font-mono">
                      {path}
                    </span>
                  </div>
                  <button
                    onClick={() => removeCustomScanPath(path)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-neutral-600 transition-all duration-150 cursor-pointer"
                  >
                    <X size={14} className="text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 dark:text-neutral-500 mb-3">
              No custom directories added yet.
            </p>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newCustomPath}
              onChange={(e) => setNewCustomPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              placeholder="/path/to/scan"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            <Button
              variant="secondary"
              onClick={handleBrowseCustom}
              size="sm"
              icon={<FolderOpen size={14} />}
            >
              Browse
            </Button>
            <Button onClick={handleAddCustom} size="sm" icon={<Plus size={14} />}>
              Add
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Storage History Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <History size={20} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                Reclaimed Storage Statistics
              </h3>
              <p className="text-xs text-slate-400 dark:text-neutral-500">
                Lifetime freed: <strong className="text-emerald-600 dark:text-emerald-400">{formatSize(lifetimeBytesFreed)}</strong> ({cleanHistory.length} sessions recorded)
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-neutral-400">
              Manage cached history and cleanup statistics
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={clearCleanHistory}
              disabled={cleanHistory.length === 0}
              icon={<Trash2 size={13} />}
            >
              Clear Log History
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* About */}
      <Card>
        <CardBody>
          <div className="text-center py-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
              Beberes
            </h3>
            <p className="text-sm text-slate-400 dark:text-neutral-500">
              High-Performance System Cleaner for macOS & Developers
            </p>
            <p className="text-xs text-slate-300 dark:text-neutral-600 mt-2">
              v0.2.0 • Powered by Tauri v2 + Rust + React
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
