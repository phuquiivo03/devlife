"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type LoadingScreenProps = {
  onComplete: () => void;
};

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadAssets = async () => {
      try {
        console.log("[LoadingScreen] Starting asset load...");

        const tasks = [
          // Load atlas JSON
          fetch("/atlas/devlife.json")
            .then((res) => {
              console.log("[LoadingScreen] Atlas JSON response:", res.status);
              if (!res.ok) throw new Error(`Atlas JSON: HTTP ${res.status}`);
              return res.json();
            })
            .then((data) => {
              console.log("[LoadingScreen] Atlas JSON loaded");
              return data;
            })
            .catch((err) => {
              console.error("[LoadingScreen] Atlas JSON failed:", err);
              throw new Error("Lỗi tải atlas JSON");
            }),
          // Load atlas image
          new Promise((resolve, reject) => {
            if (typeof window === "undefined") {
              reject(new Error("Window không khả dụng"));
              return;
            }
            const img = document.createElement("img");
            img.onload = () => {
              console.log("[LoadingScreen] Atlas image loaded successfully");
              resolve(img);
            };
            img.onerror = (e) => {
              console.error("[LoadingScreen] Atlas image failed to load:", e);
              reject(new Error("Lỗi tải hình atlas"));
            };
            console.log("[LoadingScreen] Starting atlas image load...");
            img.src = "/atlas/devlife.png";
          }),
          // Load audio manifest
          fetch("/audio/manifest.json")
            .then((res) => {
              console.log("[LoadingScreen] Audio manifest response:", res.status);
              if (!res.ok) throw new Error(`Audio manifest: HTTP ${res.status}`);
              return res.json();
            })
            .then((data) => {
              console.log("[LoadingScreen] Audio manifest loaded");
              return data;
            })
            .catch((err) => {
              console.error("[LoadingScreen] Audio manifest failed:", err);
              throw new Error("Lỗi tải audio manifest");
            }),
          // Load audio sprite offsets
          fetch("/audio/sprite/offsets.json")
            .then((res) => {
              console.log("[LoadingScreen] Audio sprite response:", res.status);
              if (!res.ok) throw new Error(`Audio sprite: HTTP ${res.status}`);
              return res.json();
            })
            .then((data) => {
              console.log("[LoadingScreen] Audio sprite loaded");
              return data;
            })
            .catch((err) => {
              console.error("[LoadingScreen] Audio sprite failed:", err);
              throw new Error("Lỗi tải audio sprite");
            }),
        ];

        let completed = 0;
        const total = tasks.length;

        // Track progress as each task completes
        const trackedTasks = tasks.map((task, index) =>
          task.then((result) => {
            if (cancelled) return result;
            completed += 1;
            const pct = Math.round((completed / total) * 100);
            console.log(`[LoadingScreen] Task ${index + 1}/${total} complete (${pct}%)`);
            setProgress(pct);
            return result;
          }),
        );

        await Promise.all(trackedTasks);
        console.log("[LoadingScreen] All assets loaded successfully");

        if (cancelled) return;

        // Hold at 100% for 300ms before fading out
        setProgress(100);
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (cancelled) return;

        // Start fade out
        setFadeOut(true);
        await new Promise((resolve) => setTimeout(resolve, 400));

        if (cancelled) return;

        console.log("[LoadingScreen] Completing...");
        onComplete();
      } catch (err) {
        if (cancelled) return;
        console.error("[LoadingScreen] Asset loading failed:", err);
        setError(err instanceof Error ? err.message : "Tải thất bại");
      }
    };

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, [onComplete]);

  const handleRetry = () => {
    setError(null);
    setProgress(0);
    window.location.reload();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[var(--panel-bg)] transition-opacity duration-400 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{
        backgroundImage: "var(--background-gradient)",
      }}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-6 px-4 sm:w-[90%]">
        {/* Logo/Animation */}
        <div className="relative h-32 w-40">
          <Image
            src="/ui/gif/loading_screen.gif"
            alt="Đang tải"
            width={160}
            height={128}
            className="pixelated"
            priority
            unoptimized
          />
        </div>

        {/* Loading Card */}
        <div className="w-full rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col gap-4">
            {/* Title */}
            <h2 className="text-center font-galmuri-11 text-galmuri-title-lg text-[var(--foreground)]">
              {error ? "Tải thất bại" : "Đang tải..."}
            </h2>

            {/* Progress Bar */}
            {!error && (
              <div className="flex flex-col gap-2">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center font-galmuri-9 text-galmuri-body text-[var(--foreground)]/70">
                  {progress}%
                </p>
              </div>
            )}

            {/* Error Message & Retry Button */}
            {error && (
              <div className="flex flex-col gap-3">
                <p className="text-center font-galmuri-9 text-galmuri-caption text-red-400">
                  {error}
                </p>
                <button
                  onClick={handleRetry}
                  className="group relative overflow-hidden rounded-lg border border-white/20 bg-gradient-to-b from-white/10 to-white/5 px-6 py-3 font-galmuri-9 text-galmuri-body text-[var(--foreground)] transition-all hover:border-violet-400/40 hover:from-white/15 hover:to-white/10 active:scale-[0.98]"
                >
                  <span className="relative z-10">Thử lại</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/10 to-violet-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
