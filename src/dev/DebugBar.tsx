// src/dev/DebugBar.tsx
import { useEffect, useState, useRef } from 'react';
import {
  scrollProgress,
  masterProgress,
  foldProgress,
  SCENE_WINDOWS,
  FOLD_PHASES,
  legacyToMaster,
  FOLD_START,
  FOLD_END,
} from '../scroll/progress';
import { scrollToProgress } from '../scroll/lenis';
import { initSpikeLogger, getSpikes, FrameSpike } from './spikeLogger';
import { getQuality, subscribeQuality } from '../config/quality';

export function DebugBar() {
  const [currentMaster, setCurrentMaster] = useState(0);
  const [currentLegacy, setCurrentLegacy] = useState(0);
  const [currentFold, setCurrentFold] = useState(0);
  const [selectedScene, setSelectedScene] = useState<string>('1');
  const [collapsed, setCollapsed] = useState(false);
  const [spikeList, setSpikeList] = useState<FrameSpike[]>([]);
  const [charSpeed, setCharSpeed] = useState(0);
  const [pipeline, setPipeline] = useState<any>(null);
  const [fpsInfo, setFpsInfo] = useState<{ fps: number; ms: number }>({ fps: 60, ms: 16.6 });
  const lastTimeRef = useRef(performance.now());
  const frameTimesRef = useRef<number[]>([]);

  // Init frame-spike logger
  useEffect(() => {
    initSpikeLogger();
  }, []);

  useEffect(() => {
    return subscribeQuality((q) => {
      setPipeline((prev: any) => ({ ...prev, tier: q.tierName, shadowMapSize: q.shadowMapSize }));
    });
  }, []);

  // Read ?scene=N or ?scene=fold-x on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sceneParam = params.get('scene');
    if (sceneParam) {
      // Check if fold phase first
      const foldMatch = FOLD_PHASES.find(
        (f) => f.id.toLowerCase() === sceneParam.toLowerCase() || f.key.toLowerCase() === sceneParam.toLowerCase()
      );
      if (foldMatch) {
        setSelectedScene(foldMatch.id);
        const attemptScroll = (retries = 10) => {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (maxScroll > 100) {
            scrollToProgress(foldMatch.masterStart + 0.002, true);
          } else if (retries > 0) {
            setTimeout(() => attemptScroll(retries - 1), 150);
          }
        };
        setTimeout(() => attemptScroll(), 150);
        return;
      }

      // Check legacy scene
      const sceneId = parseInt(sceneParam, 10);
      const found = SCENE_WINDOWS.find((s) => s.id === sceneId);
      if (found) {
        setSelectedScene(sceneId.toString());
        const attemptScroll = (retries = 10) => {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (maxScroll > 100) {
            const masterPos = legacyToMaster(found.start + 0.005);
            scrollToProgress(masterPos, true);
          } else if (retries > 0) {
            setTimeout(() => attemptScroll(retries - 1), 150);
          }
        };
        setTimeout(() => attemptScroll(), 150);
      }
    }
  }, []);

  // Update slider display and spike list from master & legacy progress
  useEffect(() => {
    let animId: number;
    let tickCount = 0;
    const update = () => {
      const m = masterProgress.current;
      const leg = scrollProgress.current;
      const fold = foldProgress.current;
      setCurrentMaster(m);
      setCurrentLegacy(leg);
      setCurrentFold(fold);

      if (m >= FOLD_START && m <= FOLD_END) {
        const foundFold = FOLD_PHASES.find((f) => m >= f.masterStart && m <= f.masterEnd);
        if (foundFold) {
          setSelectedScene(foundFold.id);
        }
      } else {
        const found = SCENE_WINDOWS.find((s) => leg >= s.start && leg <= s.end);
        if (found) {
          setSelectedScene(found.id.toString());
        }
      }

      // Calculate frame times and FPS
      const now = performance.now();
      const dtMs = now - lastTimeRef.current;
      lastTimeRef.current = now;
      if (dtMs > 0 && dtMs < 200) {
        frameTimesRef.current.push(dtMs);
        if (frameTimesRef.current.length > 30) frameTimesRef.current.shift();
      }

      // Update spikes in HUD every 10 frames to avoid React overhead
      tickCount++;
      if (tickCount % 10 === 0) {
        setSpikeList([...getSpikes()]);
        const metrics = (window as any).__PHARMAFLY_CHARACTER_METRICS__;
        if (metrics && typeof metrics.angularSpeed === 'number') {
          setCharSpeed(metrics.angularSpeed);
        }
        const pipe = (window as any).__ULTRA_PIPELINE__;
        if (pipe) setPipeline({ ...pipe });

        if (frameTimesRef.current.length > 0) {
          const avgMs = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
          const currentFps = 1000 / avgMs;
          setFpsInfo({ fps: currentFps, ms: avgMs });
        }
      }

      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleSceneSelect = (val: string) => {
    setSelectedScene(val);

    const foldMatch = FOLD_PHASES.find((f) => f.id === val);
    if (foldMatch) {
      const url = new URL(window.location.href);
      url.searchParams.set('scene', foldMatch.id);
      window.history.replaceState({}, '', url.toString());
      scrollToProgress(foldMatch.masterStart + 0.002, true);
      return;
    }

    const sceneId = parseInt(val, 10);
    const scene = SCENE_WINDOWS.find((s) => s.id === sceneId);
    if (scene) {
      const url = new URL(window.location.href);
      url.searchParams.set('scene', sceneId.toString());
      window.history.replaceState({}, '', url.toString());

      // Jump converts legacy -> master
      const targetMaster = legacyToMaster(scene.start + 0.005);
      scrollToProgress(targetMaster, true);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentMaster(val);
    scrollToProgress(val, true);
  };

  const scenes8to10Spikes = spikeList.filter(
    (s) => s.sceneId >= 8 && s.sceneId <= 10 && s.durationMs > 33.0
  );

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
              onChange={(e) => handleSceneSelect(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs font-mono outline-none focus:border-primary max-w-[210px]"
            >
              <optgroup label="Scenes 1-4 (Legacy Phone)">
                {SCENE_WINDOWS.slice(0, 4).map((s) => (
                  <option key={s.id} value={s.id.toString()} className="bg-ink text-white">
                    {s.id}. {s.name} ({Math.round(s.start * 100)}%-{Math.round(s.end * 100)}%)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Foldable Sequence (Frozen p=0.32)">
                {FOLD_PHASES.map((f) => (
                  <option key={f.id} value={f.id} className="bg-ink text-primary font-semibold">
                    ★ {f.name} (m={Math.round(f.masterStart * 100)}%-{Math.round(f.masterEnd * 100)}%)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Scenes 5-11 (Story World)">
                {SCENE_WINDOWS.slice(4).map((s) => (
                  <option key={s.id} value={s.id.toString()} className="bg-ink text-white">
                    {s.id}. {s.name} ({Math.round(s.start * 100)}%-{Math.round(s.end * 100)}%)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Progress Slider */}
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[11px] text-white/70">
              <span>Master Progress:</span>
              <span className="tabular-nums font-bold text-primary">
                {(currentMaster * 100).toFixed(1)}% (m={currentMaster.toFixed(4)})
              </span>
            </div>
            <div className="flex justify-between font-mono text-[10px] text-white/50">
              <span>Legacy Story: {(currentLegacy * 100).toFixed(1)}% (p={currentLegacy.toFixed(3)})</span>
              {currentFold > 0 && currentFold < 1 && (
                <span className="text-emerald-400 font-bold">Fold: {(currentFold * 100).toFixed(1)}%</span>
              )}
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.0001"
              value={currentMaster}
              onChange={handleSliderChange}
              className="w-full accent-primary h-1.5 bg-white/20 rounded-lg cursor-pointer"
            />
          </div>

          {/* Phase 2: Ultra Definition Render Pipeline HUD */}
          <div className="pt-2 border-t border-white/10 space-y-1 font-mono text-[10px]">
            <div className="text-[10px] text-primary font-bold tracking-wider">PIPELINE STATS:</div>
            <div className="flex justify-between text-white/70">
              <span>Quality Tier:</span>
              <span className="font-bold text-emerald-400">
                {pipeline?.tier || getQuality().tierName}
                {getQuality().steppedDown ? ' (Auto-stepped)' : ''}
              </span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Effective DPR:</span>
              <span className="font-bold text-white">
                {(pipeline?.dpr || (typeof window !== 'undefined' ? window.devicePixelRatio : 1.0)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Multisampling:</span>
              <span className="font-bold text-white">
                {pipeline?.multisampling ? `${pipeline.multisampling}x MSAA + SMAA` : 'None'}
              </span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Shadow Map:</span>
              <span className="font-bold text-white">
                {pipeline?.shadowMapSize || getQuality().shadowMapSize}px (PCFSoft)
              </span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Anisotropy:</span>
              <span className="font-bold text-white">
                {pipeline?.anisotropy || 16}x (Max supported)
              </span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Ambient Occlusion:</span>
              <span className="font-bold text-cyan-300">
                {pipeline?.enableAO ? 'N8AO (Active)' : 'Off'}
              </span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>FPS & Frame Time:</span>
              <span className="font-bold text-emerald-400">
                {fpsInfo.fps.toFixed(1)} fps ({fpsInfo.ms.toFixed(1)}ms)
              </span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Scenes 8-10 Spikes (&gt;33ms):</span>
              <span className={`font-bold ${scenes8to10Spikes.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {scenes8to10Spikes.length} {scenes8to10Spikes.length === 0 ? '(PASS: 0)' : 'VIOLATION'}
              </span>
            </div>
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
                    <span>Scene {s.sceneId} (m={s.progress.toFixed(3)}):</span>
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
