// src/overlay/ReducedMotionFallback.tsx
import { SCENE_WINDOWS } from '../scroll/progress';

export function ReducedMotionFallback() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="px-6 py-16 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primaryLight text-primaryDark text-xs font-semibold mb-4">
            <span>Accessible Storyboard</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold font-display tracking-tight text-ink mb-4">
            Pharmafly — How It Works
          </h1>
          <p className="text-mutedText max-w-lg mx-auto text-base">
            A stepped visual narrative of the rapid prescription delivery pipeline from patient tap to doorstep handover.
          </p>
        </div>

        <div className="space-y-12 mb-20">
          {SCENE_WINDOWS.map((scene) => (
            <div
              key={scene.id}
              className="flex flex-col md:flex-row items-start md:items-center justify-between p-8 rounded-3xl bg-surface border border-border shadow-sm hover:border-primary/40 transition-colors gap-6"
            >
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 rounded-2xl bg-primaryLight text-primaryDark flex items-center justify-center font-bold text-lg font-display">
                  {scene.id}
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-display text-ink mb-1">
                    {scene.headline}
                  </h2>
                  <p className="text-mutedText text-sm max-w-md">
                    {scene.subhead}
                  </p>
                </div>
              </div>

              <div className="px-4 py-2 rounded-xl bg-surfaceSubtle text-mutedText text-xs font-mono font-medium self-end md:self-auto">
                Stage {scene.id} · {Math.round(scene.start * 100)}% – {Math.round(scene.end * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
