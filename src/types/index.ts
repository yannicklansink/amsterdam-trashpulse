export interface Melding {
  id: string;
  hoofdcategorie: string;
  subcategorie: string;
  datumMelding: string;
  tijdstipMelding: string;
  externeStatus: string;
  doorlooptijdDagen: number | null;
  buurtNaam: string;
  wijkNaam: string;
  stadsdeelNaam: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
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
