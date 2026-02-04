export interface Melding {
  id: string;
  meldingsnummer: string;
  hoofdcategorie: string;
  subcategorie: string;
  thema: string;
  directie: string;
  regie: string;
  datumMelding: string;
  tijdstipMelding: string;
  datumOverlast: string | null;
  tijdstipOverlast: string | null;
  datumAfgerond: string | null;
  tijdstipAfgerond: string | null;
  uitersteAfhandeldatum: string | null;
  afhandeltermijn: number | null;
  status: string;
  externeStatus: string;
  kpiAfhandeltijd: string | null;
  doorlooptijdDagen: number | null;
  werkelijkeDoorlooptijdDagen: number | null;
  anoniemGemeld: string | null;
  terugkoppelingMelderTevreden: string | null;
  terugkoppelingMelder: string | null;
  meldingType: string | null;
  meldingSoort: string | null;
  buurtNaam: string;
  wijkNaam: string;
  stadsdeelNaam: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  } | null;
}

export interface Container {
  id: string;
  fractieOmschrijving: string;
  status: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface Filters {
  timeRange: "1h" | "24h" | "7d" | "30d";
  status: "all" | "open" | "afgesloten";
  subcategorie: string[];
  showContainers: boolean;
}

export interface Hotspot {
  id: string;
  name: string;
  score: number;
  openCount: number;
  closedCount: number;
  center: [number, number];
}
