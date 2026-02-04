"use client";

import type { Melding } from "@/types";

interface DetailDrawerProps {
  melding: Melding | null;
  onClose: () => void;
}

export default function DetailDrawer({ melding, onClose }: DetailDrawerProps) {
  if (!melding) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-4 md:w-96 bg-gray-900 border border-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl z-50">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">
              {melding.subcategorie || melding.hoofdcategorie}
            </h3>
            <p className="text-sm text-gray-400">
              {melding.buurtNaam && `${melding.buurtNaam}, `}
              {melding.wijkNaam && `${melding.wijkNaam}, `}
              {melding.stadsdeelNaam}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded"
            aria-label="Sluiten"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Status</p>
            <p className={melding.externeStatus === "open" ? "text-red-400" : "text-green-400"}>
              {melding.externeStatus}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Datum</p>
            <p>{melding.datumMelding}</p>
          </div>
          <div>
            <p className="text-gray-500">Tijd</p>
            <p>{melding.tijdstipMelding || "-"}</p>
          </div>
          {melding.doorlooptijdDagen !== null && (
            <div>
              <p className="text-gray-500">Doorlooptijd</p>
              <p>{melding.doorlooptijdDagen} dagen</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            ID: {melding.id}
          </p>
          <p className="text-xs text-gray-500">
            Coordinaten: {melding.geometry?.coordinates?.[1]?.toFixed(5)}, {melding.geometry?.coordinates?.[0]?.toFixed(5)}
          </p>
        </div>
      </div>
    </div>
  );
}
