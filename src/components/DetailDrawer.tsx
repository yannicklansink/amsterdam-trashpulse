"use client";

import type { Melding } from "@/types";

interface DetailDrawerProps {
  melding: Melding | null;
  onClose: () => void;
}

function formatDate(date: string | null | undefined, time?: string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(`${date}T${time || "00:00:00"}`);
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: time ? "2-digit" : undefined,
    minute: time ? "2-digit" : undefined,
  });
}

function getKpiColor(kpi: string | null): string {
  if (!kpi) return "text-gray-400";
  if (kpi.toLowerCase().includes("op tijd")) return "text-green-400";
  if (kpi.toLowerCase().includes("te laat")) return "text-red-400";
  return "text-yellow-400";
}

function InfoRow({ label, value, highlight }: { label: string; value: string | number | null; highlight?: string }) {
  if (value === null || value === "" || value === undefined) return null;
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className={`text-sm ${highlight || ""}`}>{value}</p>
    </div>
  );
}

export default function DetailDrawer({ melding, onClose }: DetailDrawerProps) {
  if (!melding) return null;

  const statusColor = melding.externeStatus === "Open" ? "text-red-400" : "text-green-400";

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-4 md:w-[420px] bg-gray-900 border border-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-800">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">
              {melding.subcategorie || melding.hoofdcategorie}
            </h3>
            <p className="text-sm text-gray-400 truncate">
              {[melding.buurtNaam, melding.wijkNaam, melding.stadsdeelNaam].filter(Boolean).join(", ")}
            </p>
            {melding.meldingsnummer && (
              <p className="text-xs text-gray-500 mt-1 font-mono">
                #{melding.meldingsnummer}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition"
            aria-label="Sluiten"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status Section */}
        <div className="py-3 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              melding.externeStatus === "Open"
                ? "bg-red-900/50 text-red-300"
                : "bg-green-900/50 text-green-300"
            }`}>
              {melding.externeStatus}
            </span>
            {melding.status && melding.status !== melding.externeStatus && (
              <span className="text-sm text-gray-400">{melding.status}</span>
            )}
            {melding.kpiAfhandeltijd && (
              <span className={`text-sm ${getKpiColor(melding.kpiAfhandeltijd)}`}>
                {melding.kpiAfhandeltijd}
              </span>
            )}
          </div>
        </div>

        {/* Timing Section */}
        <div className="py-3 border-b border-gray-800">
          <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Tijden</h4>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Gemeld" value={formatDate(melding.datumMelding, melding.tijdstipMelding)} />
            <InfoRow label="Overlast" value={formatDate(melding.datumOverlast, melding.tijdstipOverlast)} />
            <InfoRow label="Afgerond" value={formatDate(melding.datumAfgerond, melding.tijdstipAfgerond)} />
            <InfoRow label="Deadline" value={formatDate(melding.uitersteAfhandeldatum)} />
          </div>
        </div>

        {/* Duration Section */}
        {(melding.doorlooptijdDagen != null || melding.werkelijkeDoorlooptijdDagen != null || melding.afhandeltermijn != null) && (
          <div className="py-3 border-b border-gray-800">
            <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Doorlooptijd</h4>
            <div className="grid grid-cols-3 gap-3">
              <InfoRow
                label="Werkdagen"
                value={melding.doorlooptijdDagen != null ? `${melding.doorlooptijdDagen} dagen` : null}
              />
              <InfoRow
                label="Kalenderdagen"
                value={melding.werkelijkeDoorlooptijdDagen != null ? `${melding.werkelijkeDoorlooptijdDagen} dagen` : null}
              />
              <InfoRow
                label="Termijn"
                value={melding.afhandeltermijn != null ? `${melding.afhandeltermijn} dagen` : null}
              />
            </div>
          </div>
        )}

        {/* Category Section */}
        <div className="py-3 border-b border-gray-800">
          <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Categorie</h4>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Hoofdcategorie" value={melding.hoofdcategorie} />
            <InfoRow label="Subcategorie" value={melding.subcategorie} />
            <InfoRow label="Thema" value={melding.thema} />
            <InfoRow label="Type" value={melding.meldingType} />
            <InfoRow label="Soort" value={melding.meldingSoort} />
          </div>
        </div>

        {/* Organization Section */}
        {(melding.directie || melding.regie) && (
          <div className="py-3 border-b border-gray-800">
            <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Organisatie</h4>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Directie" value={melding.directie} />
              <InfoRow label="Regie" value={melding.regie} />
            </div>
          </div>
        )}

        {/* Feedback Section */}
        {(melding.anoniemGemeld != null || melding.terugkoppelingMelderTevreden != null || melding.terugkoppelingMelder != null) && (
          <div className="py-3 border-b border-gray-800">
            <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Feedback</h4>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Anoniem gemeld" value={melding.anoniemGemeld} />
              <InfoRow label="Tevreden" value={melding.terugkoppelingMelderTevreden} />
              {melding.terugkoppelingMelder && (
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs">Terugkoppeling</p>
                  <p className="text-sm">{melding.terugkoppelingMelder}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer with ID and Coordinates */}
        <div className="pt-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-mono">ID: {melding.id}</span>
            {melding.geometry && (
              <span>
                {melding.geometry.coordinates[1].toFixed(5)}, {melding.geometry.coordinates[0].toFixed(5)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
