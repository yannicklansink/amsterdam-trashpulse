"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Melding, Filters as FiltersType } from "@/types";
import FiltersComponent from "@/components/Filters";
import Ticker from "@/components/Ticker";
import Pressure from "@/components/Pressure";
import Fractie from "@/components/Fractie";
import Trends from "@/components/Trends";
import DetailDrawer from "@/components/DetailDrawer";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="text-gray-400">Kaart laden...</div>
    </div>
  ),
});

type View = "ticker" | "trends" | "pressure" | "fractie";
type HotspotSelection = {
  center: [number, number];
  radiusMeters: number;
};

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FiltersType>({
    timeRange: (searchParams.get("range") as FiltersType["timeRange"]) || "24h",
    status: (searchParams.get("status") as FiltersType["status"]) || "all",
    subcategorie: searchParams.get("sub")?.split(",").filter(Boolean) || [],
    showContainers: searchParams.get("containers") !== "false",
  });

  const [view, setView] = useState<View>(
    (searchParams.get("view") as View) || "ticker"
  );

  const [selectedMelding, setSelectedMelding] = useState<Melding | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotSelection | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("range", filters.timeRange);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.subcategorie.length > 0) params.set("sub", filters.subcategorie.join(","));
    if (!filters.showContainers) params.set("containers", "false");
    params.set("view", view);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [filters, view, router]);

  const handleMeldingClick = useCallback((melding: Melding | null) => {
    setSelectedHotspot(null);
    setSelectedMelding(melding);
  }, []);

  function handleHotspotClick(center: [number, number]) {
    setSelectedMelding(null);
    setSelectedHotspot({ center, radiusMeters: 300 });
  }

  return (
    <main className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">TrashPulse</h1>
          <span className="text-sm text-gray-500">Amsterdam</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/yannicklansink/amsterdam-trashpulse"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-200 border border-gray-700 rounded-full hover:bg-gray-800 transition"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/yannick-lansink-4b6316160/"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-200 border border-gray-700 rounded-full hover:bg-gray-800 transition"
          >
            Made by Yannick : Linkedin
          </a>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 hover:bg-gray-800 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <FiltersComponent filters={filters} onChange={setFilters} />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <Map
            filters={filters}
            onMeldingClick={handleMeldingClick}
            selectedMelding={selectedMelding}
            selectedHotspot={selectedHotspot}
          />

          <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur p-3 rounded-lg text-sm">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Meldingen</div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-300">Open</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-300">Gesloten</span>
            </div>

            {filters.showContainers && (
              <>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Containers</div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#6b7280" }} />
                  <span className="text-gray-300">Rest</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                  <span className="text-gray-300">Papier</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#10b981" }} />
                  <span className="text-gray-300">Glas</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
                  <span className="text-gray-300">Textiel</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                  <span className="text-gray-300">Plastic</span>
                </div>
              </>
            )}
          </div>
        </div>

        <aside
          className={`w-80 border-l border-gray-800 bg-gray-900 flex flex-col transition-transform ${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          } fixed md:relative right-0 top-0 h-full md:translate-x-0 z-40`}
        >
          <div className="flex border-b border-gray-800">
            {(["ticker", "trends", "pressure", "fractie"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 px-2 py-3 text-xs font-medium transition ${
                  view === v
                    ? "text-white border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {v === "ticker" ? "Feed" : v === "trends" ? "Trends" : v === "pressure" ? "Hotspots" : "Fractie"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {view === "ticker" && (
              <Ticker
                filters={filters}
                onMeldingClick={handleMeldingClick}
                selectedMelding={selectedMelding}
              />
            )}
            {view === "trends" && <Trends />}
            {view === "pressure" && <Pressure onHotspotClick={handleHotspotClick} />}
            {view === "fractie" && <Fractie filters={filters} />}
          </div>
        </aside>
      </div>

      {selectedMelding && selectedMelding.id !== "hotspot" && (
        <DetailDrawer melding={selectedMelding} onClose={() => setSelectedMelding(null)} />
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-gray-900 text-gray-400">
          Laden...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
