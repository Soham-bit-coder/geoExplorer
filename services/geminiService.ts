
import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult, UserLocation, Place, ReviewSnippet, ItineraryStep } from "../types";

const extractCoordsFromUrl = (url: string): [number, number] | undefined => {
  if (!url) return undefined;
  try {
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch && atMatch[1] && atMatch[2]) return [parseFloat(atMatch[1]), parseFloat(atMatch[2])];
    const dataMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch && dataMatch[1] && dataMatch[2]) return [parseFloat(dataMatch[1]), parseFloat(dataMatch[2])];
  } catch (e) { console.warn(e); }
  return undefined;
};

export const searchLocations = async (
  query: string,
  location?: UserLocation,
  isVisual: boolean = false,
  base64Image?: string
): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  // Maps grounding is only supported in Gemini 2.5 series models.
  const modelName = "gemini-2.5-flash";

  const config: any = {
    tools: [{ googleMaps: {} }],
    systemInstruction: `You are a Global Local Expert.
    1. Focus on specific locations found via Google Maps.
    2. For every place, extract or infer:
       - Full Address
       - 'Vibe' (e.g., Cozy, Modern, Historic)
       - 'Crowd Level' (Quiet, Moderate, Busy)
       - 'Price Range' (e.g., $, $$, $$$)
       - 'Weather Advisory' (e.g., Good for rain, Best in sun)
    3. If an image is provided, identify the landmark/storefront and search for details.
    4. Always ground your response using the Google Maps tool.`,
  };

  if (location) {
    config.toolConfig = {
      retrievalConfig: { latLng: { latitude: location.latitude, longitude: location.longitude } },
    };
  }

  let contents: any = query;
  if (isVisual && base64Image) {
    contents = {
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
        { text: `Identify this location and find similar or related spots: ${query}` }
      ]
    };
  } else {
    // Standard text query format
    contents = { parts: [{ text: query }] };
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents,
    config,
  });

  const text = response.text || "";
  const groundingLinks: { title: string; uri: string }[] = [];
  const places: Place[] = [];
  const candidate = response.candidates?.[0];
  const metadata = candidate?.groundingMetadata;

  if (metadata?.groundingChunks) {
    metadata.groundingChunks.forEach((chunk: any, index: number) => {
      if (chunk.maps) {
        const title = chunk.maps.title || "Location Found";
        const uri = chunk.maps.uri;
        groundingLinks.push({ title, uri });

        const coords = extractCoordsFromUrl(uri);
        const reviews: ReviewSnippet[] = [];
        if (chunk.maps.placeAnswerSources) {
          chunk.maps.placeAnswerSources.forEach((s: any) => {
            if (s.reviewSnippets) s.reviewSnippets.forEach((rs: any) => reviews.push({ text: rs.text, source: s.placeName || title }));
          });
        }

        let address = "";
        let description = "Verified location via Google Maps.";
        let vibe = "Local Spot";
        let crowdLevel: any = "Moderate";
        let priceRange = "$$";
        let weatherAdvisory = "Enjoy the day";

        if (text.includes(title)) {
          const parts = text.split(title);
          if (parts.length > 1) {
             const seg = parts[1].split(/\n(?=[A-Z0-9])/)[0];
             address = (seg.match(/Address:\s*(.*?)(\n|$|\|)/i)?.[1] || "").trim();
             vibe = (seg.match(/Vibe:\s*(.*?)(\n|$|\|)/i)?.[1] || "Authentic").trim();
             priceRange = (seg.match(/Price Range:\s*(.*?)(\n|$|\|)/i)?.[1] || "$$").trim();
             weatherAdvisory = (seg.match(/Weather Advisory:\s*(.*?)(\n|$|\|)/i)?.[1] || "Check local sky").trim();
             const crowdMatch = seg.match(/Crowd Level:\s*(Quiet|Moderate|Busy)/i)?.[1];
             if (crowdMatch) crowdLevel = crowdMatch;
             description = (seg.match(/Description:\s*(.*?)(\n|$)/i)?.[1] || description).trim();
          }
        }

        places.push({
          id: `place-${index}-${Date.now()}`,
          name: title,
          address: address || "Location provided by Google Maps",
          description,
          url: uri,
          sourceTitle: title,
          coordinates: coords,
          reviewSnippets: reviews,
          vibe,
          crowdLevel,
          priceRange,
          weatherAdvisory
        });
      }
    });
  }

  return { text, places, groundingLinks };
};

export const getHistoricalContext = async (placeName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Give me the historical context of ${placeName} from 100 years ago. Focus on architectural changes or cultural significance. Keep it concise (3-4 sentences).`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return response.text || "History is still being grounded...";
};

export const generateItinerary = async (places: Place[]): Promise<ItineraryStep[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const names = places.map(p => p.name).join(", ");
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a one-day itinerary using these places: ${names}. Optimize for route efficiency.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            time: { type: Type.STRING },
            placeName: { type: Type.STRING },
            activity: { type: Type.STRING }
          },
          required: ["time", "placeName", "activity"]
        }
      }
    }
  });
  try {
    return JSON.parse(response.text || "[]");
  } catch {
    return [];
  }
};
