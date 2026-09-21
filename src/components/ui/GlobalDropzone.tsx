import { useEffect, useState } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useAppStore } from '../../store/appStore';
import { PieChart, ShieldAlert, FolderDown } from 'lucide-react';

export default function GlobalDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [activeTarget, setActiveTarget] = useState<'visualizer' | 'shredder' | null>('visualizer');

  const { setCurrentPage, setVisualizerTargetPath, setShredderPreloadedPaths } = useAppStore();

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    try {
      const appWindow = getCurrentWebviewWindow();
      appWindow.onDragDropEvent((event) => {
        if (event.payload.type === 'enter' || event.payload.type === 'over') {
          setIsDragging(true);
          const x = event.payload.position?.x ?? 0;
          const midX = window.innerWidth / 2;
          setActiveTarget(x < midX ? 'visualizer' : 'shredder');
        } else if (event.payload.type === 'drop') {
          setIsDragging(false);
          const paths = event.payload.paths;
          if (paths && paths.length > 0) {
            const x = event.payload.position?.x ?? 0;
            const midX = window.innerWidth / 2;
            if (x < midX) {
              setVisualizerTargetPath(paths[0]);
              setCurrentPage('disk-visualizer');
            } else {
              setShredderPreloadedPaths(paths);
              setCurrentPage('file-shredder');
            }
          }
        } else if (event.payload.type === 'leave') {
          setIsDragging(false);
          setActiveTarget(null);
        }
      }).then((fn) => {
        unlisten = fn;
      }).catch(() => {});
    } catch {}

    // Prevent default browser file-open behavior
    const handleWindowDragOver = (e: DragEvent) => e.preventDefault();
    const handleWindowDrop = (e: DragEvent) => e.preventDefault();

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      if (unlisten) unlisten();
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [setCurrentPage, setVisualizerTargetPath, setShredderPreloadedPaths]);

  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center p-8 bg-black/60 dark:bg-black/75 backdrop-blur-2xl animate-fade-in">
      <div className="flex items-center gap-3 text-white mb-8">
        <FolderDown className="w-8 h-8 text-accent animate-bounce" />
        <h2 className="text-2xl font-bold tracking-tight">Drop files or folders anywhere</h2>
      </div>

      <div className="grid grid-cols-2 gap-6 w-full max-w-3xl">
        {/* Drop Zone 1: Disk Visualizer */}
        <div
          className={`p-8 rounded-3xl border-2 transition-all flex flex-col items-center text-center justify-center gap-4 ${
            activeTarget === 'visualizer'
              ? 'border-accent bg-accent/20 scale-[1.03] shadow-2xl shadow-accent/20'
              : 'border-white/20 bg-white/5 opacity-70'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <PieChart className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Disk Visualizer</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-[220px]">
              Inspeksi struktur dan visualisasikan ukuran file/folder di multi-ring sunburst
            </p>
          </div>
        </div>

        {/* Drop Zone 2: File Shredder */}
        <div
          className={`p-8 rounded-3xl border-2 transition-all flex flex-col items-center text-center justify-center gap-4 ${
            activeTarget === 'shredder'
              ? 'border-red-500 bg-red-500/20 scale-[1.03] shadow-2xl shadow-red-500/20'
              : 'border-white/20 bg-white/5 opacity-70'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">File Shredder</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-[220px]">
              Hancurkan file atau folder secara permanen dengan multi-pass data overwrite
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
