"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Melding, Filters as FiltersType } from "@/types";
import FiltersComponent from "@/components/Filters";
import Ticker from "@/components/Ticker";
import Pressure from "@/components/Pressure";
import Backlog from "@/components/Backlog";
import DetailDrawer from "@/components/DetailDrawer";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="text-gray-400">Kaart laden...</div>
    </div>
  ),
});

type View = "ticker" | "pressure" | "backlog";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FiltersType>({
    timeRange: (searchParams.get("range") as FiltersType["timeRange"]) || "24h",
    status: (searchParams.get("status") as FiltersType["status"]) || "all",
    subcategorie: searchParams.get("sub")?.split(",").filter(Boolean) || [],
  });

  const [view, setView] = useState<View>(
    (searchParams.get("view") as View) || "ticker"
  );

  const [selectedMelding, setSelectedMelding] = useState<Melding | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("range", filters.timeRange);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.subcategorie.length > 0) params.set("sub", filters.subcategorie.join(","));
    params.set("view", view);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [filters, view, router]);

  const handleMeldingClick = useCallback((melding: Melding | null) => {
    setSelectedMelding(melding);
  }, []);

  function handleHotspotClick(center: [number, number]) {
    setSelectedMelding({
      id: "hotspot",
      hoofdcategorie: "",
      subcategorie: "",
      datumMelding: "",
      tijdstipMelding: "",
      externeStatus: "",
      doorlooptijdDagen: null,
      buurtNaam: "",
      wijkNaam: "",
      stadsdeelNaam: "",
      geometry: { type: "Point", coordinates: center },
    });
    setTimeout(() => setSelectedMelding(null), 100);
  }

  return (
    <main className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">TrashPulse</h1>
          <span className="text-sm text-gray-500">Amsterdam</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden p-2 hover:bg-gray-800 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      <FiltersComponent filters={filters} onChange={setFilters} />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <Map
            filters={filters}
            onMeldingClick={handleMeldingClick}
            selectedMelding={selectedMelding}
          />

          <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur p-3 rounded-lg text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-300">Open melding</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-300">Gesloten melding</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-gray-300">Container</span>
            </div>
          </div>
        </div>

        <aside
          className={`w-80 border-l border-gray-800 bg-gray-900 flex flex-col transition-transform ${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          } fixed md:relative right-0 top-0 h-full md:translate-x-0 z-40`}
        >
          <div className="flex border-b border-gray-800">
            {(["ticker", "pressure", "backlog"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                  view === v
                    ? "text-white border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {v === "ticker" ? "Feed" : v === "pressure" ? "Hotspots" : "Backlog"}
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
            {view === "pressure" && <Pressure onHotspotClick={handleHotspotClick} />}
            {view === "backlog" && <Backlog />}
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
