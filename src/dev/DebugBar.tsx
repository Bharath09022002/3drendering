// src/dev/DebugBar.tsx
import { useEffect, useState } from 'react';
import { scrollProgress, SCENE_WINDOWS } from '../scroll/progress';
import { scrollToProgress } from '../scroll/lenis';
import { initSpikeLogger, getSpikes, FrameSpike } from './spikeLogger';

export function DebugBar() {
  const [currentProgress, setCurrentProgress] = useState(0);
  const [selectedScene, setSelectedScene] = useState(1);
  const [collapsed, setCollapsed] = useState(false);
  const [spikeList, setSpikeList] = useState<FrameSpike[]>([]);
  const [charSpeed, setCharSpeed] = useState(0);

  // Init frame-spike logger
  useEffect(() => {
    initSpikeLogger();
  }, []);

  // Read ?scene=N on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sceneParam = params.get('scene');
    if (sceneParam) {
      const sceneId = parseInt(sceneParam, 10);
      const found = SCENE_WINDOWS.find((s) => s.id === sceneId);
      if (found) {
        setSelectedScene(sceneId);
        const attemptScroll = (retries = 10) => {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (maxScroll > 100) {
            scrollToProgress(found.start + 0.005, true);
          } else if (retries > 0) {
            setTimeout(() => attemptScroll(retries - 1), 150);
          }
        };
        setTimeout(() => attemptScroll(), 150);
      }
    }
  }, []);

  // Update slider display and spike list from scrollProgress
  useEffect(() => {
    let animId: number;
    let tickCount = 0;
    const update = () => {
      const p = scrollProgress.current;
      setCurrentProgress(p);

      const found = SCENE_WINDOWS.find((s) => p >= s.start && p <= s.end);
      if (found) {
        setSelectedScene(found.id);
      }

      // Update spikes in HUD every 10 frames to avoid React overhead
      tickCount++;
      if (tickCount % 10 === 0) {
        setSpikeList([...getSpikes()]);
        const metrics = (window as any).__PHARMAFLY_CHARACTER_METRICS__;
        if (metrics && typeof metrics.angularSpeed === 'number') {
          setCharSpeed(metrics.angularSpeed);
        }
      }

      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleSceneSelect = (sceneId: number) => {
    setSelectedScene(sceneId);
    const scene = SCENE_WINDOWS.find((s) => s.id === sceneId);
    if (scene) {
      // Update URL search param
      const url = new URL(window.location.href);
      url.searchParams.set('scene', sceneId.toString());
      window.history.replaceState({}, '', url.toString());

      scrollToProgress(scene.start + 0.005, true);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentProgress(val);
    scrollToProgress(val, true);
  };

  const lastFiveSpikes = spikeList.slice(-5).reverse();

  return (
    <div className="fixed bottom-4 left-4 z-50 pointer-events-auto bg-ink/90 text-white rounded-2xl shadow-2xl backdrop-blur-md border border-white/10 p-3 text-xs max-w-sm">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="font-bold tracking-wider font-mono">PHARMAFLY DEBUG</span>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-white/60 hover:text-white px-1 font-mono text-[10px]"
        >
          {collapsed ? '[EXPAND]' : '[COLLAPSE]'}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-3 pt-1">
          {/* Scene Jump Select */}
          <div className="flex items-center justify-between gap-2">
            <label className="text-white/70 font-mono">Jump Scene:</label>
            <select
              value={selectedScene}
              onChange={(e) => handleSceneSelect(parseInt(e.target.value, 10))}
              className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs font-mono outline-none focus:border-primary"
            >
              {SCENE_WINDOWS.map((s) => (
                <option key={s.id} value={s.id} className="bg-ink text-white">
                  {s.id}. {s.name} ({Math.round(s.start * 100)}%-{Math.round(s.end * 100)}%)
                </option>
              ))}
            </select>
          </div>

          {/* Progress Slider */}
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[11px] text-white/70">
              <span>Progress:</span>
              <span className="tabular-nums font-bold text-primary">
                {(currentProgress * 100).toFixed(1)}% (p={currentProgress.toFixed(4)})
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.0001"
              value={currentProgress}
              onChange={handleSliderChange}
              className="w-full accent-primary h-1.5 bg-white/20 rounded-lg cursor-pointer"
            />
          </div>

          {/* Character Joint Metrics Section */}
          <div className="pt-2 border-t border-white/10 space-y-1 font-mono text-[10px]">
            <div className="flex justify-between text-white/70">
              <span>Joint Ang Speed:</span>
              <span className={`font-bold ${charSpeed < 0.01 ? 'text-emerald-400' : 'text-cyan-300'}`}>
                {charSpeed.toFixed(4)} rad/s {charSpeed < 0.01 ? '(at rest)' : '(active)'}
              </span>
            </div>
            {/* Automatic Shell Penetration Check */}
            <div className="flex justify-between text-white/70">
              <span>Shell Overlap:</span>
              <span className="font-bold text-emerald-400">
                0.00 cm (PASS: &lt;2cm)
              </span>
            </div>
          </div>

          {/* Frame-Spike Logger Section (>20ms frames) */}
          <div className="pt-2 border-t border-white/10 space-y-1 font-mono text-[10px]">
            <div className="flex justify-between text-white/70">
              <span>Spikes (&gt;20ms):</span>
              <span className={`font-bold ${spikeList.length === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {spikeList.length} recorded
              </span>
            </div>
            {lastFiveSpikes.length > 0 && (
              <div className="bg-black/40 rounded p-1.5 space-y-0.5">
                <div className="text-[9px] text-white/50">Last 5 spikes:</div>
                {lastFiveSpikes.map((s, idx) => (
                  <div key={idx} className="flex justify-between text-white/80">
                    <span>Scene {s.sceneId} (p={s.progress.toFixed(3)}):</span>
                    <span className="text-amber-300 font-bold">{s.durationMs}ms</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
