
export interface ReviewSnippet {
  text: string;
  source?: string;
}

export interface Place {
  id: string;
  name: string;
  description: string;
  address?: string;
  rating?: number;
  coordinates?: [number, number];
  url?: string;
  sourceTitle?: string;
  hours?: string;
  phone?: string;
  website?: string;
  reviewSnippets?: ReviewSnippet[];
  vibe?: string;
  crowdLevel?: 'Quiet' | 'Moderate' | 'Busy' | 'Unknown';
  priceRange?: string;
  historicalContext?: string;
  weatherAdvisory?: string;
}

export interface ItineraryStep {
  time: string;
  placeName: string;
  activity: string;
}

export interface SearchResult {
  text: string;
  places: Place[];
  groundingLinks: { title: string; uri: string }[];
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}
