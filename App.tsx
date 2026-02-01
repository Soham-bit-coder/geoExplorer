
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Navigation, Loader2, Info, Compass, 
  ArrowLeft, Globe, Star, MapPin, Building, MessageSquare, 
  User, ExternalLink, Heart, Sparkles, Coffee, Users,
  Share2, Utensils, TreePine, Landmark, ShoppingBag, Clock,
  Camera, Mic, MicOff, ListOrdered, History, CloudSun, DollarSign,
  ChevronRight, CalendarCheck, Map as MapIcon, X, Sun, Moon
} from 'lucide-react';
import { searchLocations, getHistoricalContext, generateItinerary } from './services/geminiService';
import { Place, SearchResult, UserLocation, ItineraryStep } from './types';
import Map from './components/Map';

const App: React.FC = () => {
  // --- Standard State ---
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [mapTheme, setMapTheme] = useState<'voyager' | 'dark' | 'positron'>('voyager');

  // --- Pro Features State ---
  const [showItinerary, setShowItinerary] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryStep[]>([]);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [isCoPilotActive, setIsCoPilotActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Sync: Determine which places to show based on current context ---
  const displayedPlaces = showFavorites ? favorites : (result?.places || []);

  useEffect(() => {
    const savedFavs = localStorage.getItem('geoexplorer_favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    const savedHistory = localStorage.getItem('geoexplorer_history');
    if (savedHistory) setRecentSearches(JSON.parse(savedHistory));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setUserLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        },
        () => setUserLocation(null),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('geoexplorer_favorites', JSON.stringify(favorites));
    localStorage.setItem('geoexplorer_history', JSON.stringify(recentSearches));
  }, [favorites, recentSearches]);

  useEffect(() => {
    if (selectedPlace) {
      setActivePlace(selectedPlace);
      setIsHistoryMode(false);
    }
  }, [selectedPlace]);

  const handleSearch = async (e?: React.FormEvent, customQuery?: string, isVisual: boolean = false, base64?: string) => {
    if (e) e.preventDefault();
    const q = customQuery || query;
    if (!q.trim() && !isVisual) return;

    setLoading(true);
    setError(null);
    setSelectedPlace(null);
    setShowFavorites(false);
    if (q) addToHistory(q);
    
    try {
      const searchResult = await searchLocations(q, userLocation || undefined, isVisual, base64);
      setResult(searchResult);
    } catch (err: any) {
      setError("Exploration failed. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  const addToHistory = (q: string) => {
    setRecentSearches(prev => [q, ...prev.filter(i => i.toLowerCase() !== q.toLowerCase())].slice(0, 5));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        handleSearch(undefined, "Identify this", true, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleItinerary = async () => {
    if (favorites.length < 2) return alert("Add at least 2 places to your Saved list first.");
    setItineraryLoading(true);
    setShowItinerary(true);
    try {
      const steps = await generateItinerary(favorites);
      setItinerary(steps);
    } catch {
      alert("Itinerary failed.");
    } finally {
      setItineraryLoading(false);
    }
  };

  const toggleHistoryMode = async () => {
    if (!activePlace) return;
    if (!isHistoryMode && !activePlace.historicalContext) {
      setHistoryLoading(true);
      try {
        const history = await getHistoricalContext(activePlace.name);
        setActivePlace({ ...activePlace, historicalContext: history });
      } catch {
        alert("Could not travel back in time.");
      } finally {
        setHistoryLoading(false);
      }
    }
    setIsHistoryMode(!isHistoryMode);
  };

  const toggleFavorite = (place: Place) => {
    const exists = favorites.find(p => p.url === place.url);
    setFavorites(prev => exists ? prev.filter(p => p.url !== place.url) : [...prev, place]);
  };

  const sharePlace = (place: Place) => {
    if (navigator.share) navigator.share({ title: place.name, url: place.url });
    else window.open(place.url, '_blank');
  };

  const isFavorite = (p: Place) => favorites.some(fav => fav.url === p.url);

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* --- HEADER --- */}
      <header className="bg-white border-b px-4 py-3 flex flex-col z-40 shadow-sm gap-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-indigo-600 cursor-pointer group shrink-0" onClick={() => window.location.reload()}>
            <div className="relative">
              <Compass className="w-8 h-8 group-hover:rotate-180 transition-transform duration-700" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic">GeoExplorer <span className="text-gray-400">PRO</span></h1>
          </div>

          <form onSubmit={handleSearch} className="relative w-full md:max-w-2xl flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Talk to the AI or search places..."
                className="w-full pl-11 pr-24 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm font-bold shadow-inner"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all" title="AI Lens (Visual Search)">
                  <Camera className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => setIsCoPilotActive(!isCoPilotActive)} className={`p-2 rounded-xl transition-all ${isCoPilotActive ? 'bg-indigo-600 text-white animate-pulse' : 'text-gray-400 hover:text-indigo-600 hover:bg-white'}`} title="Voice Co-Pilot">
                  {isCoPilotActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            </div>
            <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ground Search"}
            </button>
          </form>

          <div className="flex gap-2">
            <button onClick={handleItinerary} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-black text-[10px] uppercase tracking-wider hover:bg-indigo-100 transition-all">
              <CalendarCheck className="w-4 h-4" />
              Itinerary
            </button>
            <button onClick={() => setShowFavorites(!showFavorites)} className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all border-2 ${showFavorites ? 'bg-rose-500 text-white border-rose-500 shadow-rose-200 shadow-lg' : 'bg-white text-rose-500 border-rose-50 shadow-sm hover:shadow-md'}`}>
              <Heart className={`w-4 h-4 ${showFavorites ? 'fill-white' : ''}`} />
              Saved ({favorites.length})
            </button>
          </div>
        </div>
      </header>

      {/* --- MAIN LAYOUT --- */}
      <main className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
        
        {/* --- LEFT PANEL: LIST & DETAILS --- */}
        <div className="w-full md:w-96 lg:w-[480px] bg-white border-r relative z-30 overflow-hidden flex flex-col shadow-2xl">
          <div className={`flex w-[200%] h-full transition-transform duration-700 cubic-bezier(0.2, 0.8, 0.2, 1) ${selectedPlace ? '-translate-x-1/2' : 'translate-x-0'}`}>
            
            {/* --- LIST VIEW --- */}
            <div className="w-1/2 h-full flex flex-col overflow-y-auto bg-white border-r custom-scrollbar">
              <div className="p-4 bg-gray-50/50 border-b flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
                 <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{showFavorites ? 'Curated Collection' : 'Grounded Results'}</h3>
                 <div className="flex items-center gap-2">
                    {result && <span className="text-[9px] font-black text-indigo-500 bg-white border border-indigo-100 px-2 py-1 rounded-lg">Real-time Grounded</span>}
                 </div>
              </div>

              {loading && (
                <div className="flex-grow flex flex-col items-center justify-center p-12 space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <Sparkles className="w-6 h-6 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-gray-800 uppercase tracking-widest">Grounding Reality...</p>
                    <p className="text-[10px] text-gray-400 mt-1 font-bold">Querying Maps & History Engine</p>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-4">
                {displayedPlaces.map((place) => (
                  <div key={place.id} onClick={() => setSelectedPlace(place)} className="group p-5 rounded-[2.5rem] border-2 border-transparent bg-gray-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden">
                    <button onClick={(e) => {e.stopPropagation(); toggleFavorite(place);}} className="absolute top-4 right-4 p-2.5 rounded-full hover:bg-rose-50 transition-colors z-10 bg-white/50 backdrop-blur-md">
                      <Heart className={`w-4 h-4 ${isFavorite(place) ? 'fill-rose-500 text-rose-500' : 'text-gray-300'}`} />
                    </button>
                    <h4 className="text-lg font-black text-gray-900 group-hover:text-indigo-600 transition-colors tracking-tighter pr-8">{place.name}</h4>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                       <span className="text-[9px] font-black uppercase bg-white text-indigo-600 px-2 py-1 rounded-lg border border-indigo-50">{place.vibe || 'Unique'}</span>
                       <span className="text-[9px] font-black uppercase bg-white text-emerald-600 px-2 py-1 rounded-lg border border-emerald-50">{place.priceRange || '$$'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-4 line-clamp-2 font-medium leading-relaxed">{place.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* --- DETAIL VIEW --- */}
            <div className="w-1/2 h-full flex flex-col bg-white overflow-y-auto custom-scrollbar">
              {activePlace && (
                <div className="flex flex-col h-full">
                  <div className="sticky top-0 bg-white/95 backdrop-blur-xl z-30 p-4 border-b flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <button onClick={() => setSelectedPlace(null)} className="p-2.5 hover:bg-gray-100 rounded-2xl transition-all">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <h2 className="font-black truncate max-w-[200px] text-lg tracking-tight">{activePlace.name}</h2>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => sharePlace(activePlace)} className="p-3 rounded-2xl bg-gray-50 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-all">
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => toggleFavorite(activePlace)} className={`p-3 rounded-2xl transition-all ${isFavorite(activePlace) ? 'bg-rose-50 text-rose-500' : 'bg-gray-50 text-gray-400 hover:text-rose-500'}`}>
                        <Heart className={`w-5 h-5 ${isFavorite(activePlace) ? 'fill-rose-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Insights Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-indigo-50/30 rounded-[2rem] border border-indigo-100 text-center group hover:bg-indigo-50 transition-all">
                         <CloudSun className="w-6 h-6 text-indigo-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                         <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Weather Context</p>
                         <p className="text-[11px] font-bold text-indigo-600">{activePlace.weatherAdvisory || 'Ideal for a walk'}</p>
                      </div>
                      <div className="p-4 bg-gray-50/50 rounded-[2rem] border border-gray-100 text-center group hover:bg-gray-100 transition-all">
                         <DollarSign className="w-6 h-6 text-gray-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                         <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Budget Range</p>
                         <p className="text-[11px] font-bold text-gray-600">{activePlace.priceRange || 'Moderate'}</p>
                      </div>
                    </div>

                    {/* Pro: Time Travel Mode */}
                    <section className="bg-amber-50/50 p-6 rounded-[2.5rem] border border-amber-100 relative overflow-hidden group">
                      <div className="flex items-center justify-between relative z-10 mb-4">
                        <div className="flex items-center gap-3">
                          <History className="w-5 h-5 text-amber-600" />
                          <h3 className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Time Travel Mode</h3>
                        </div>
                        <button 
                          onClick={toggleHistoryMode}
                          className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${isHistoryMode ? 'bg-amber-600 text-white' : 'bg-white text-amber-600 border border-amber-200'}`}
                        >
                          {historyLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isHistoryMode ? 'Back to Now' : 'Go Back 100 Years'}
                        </button>
                      </div>
                      <div className={`transition-all duration-500 origin-top ${isHistoryMode ? 'max-h-96 opacity-100 scale-100' : 'max-h-0 opacity-0 scale-95 overflow-hidden'}`}>
                         <p className="text-sm font-bold text-amber-900 leading-relaxed italic">
                           {activePlace.historicalContext || "Grounding history for this coordinates..."}
                         </p>
                      </div>
                    </section>

                    <div className="grid grid-cols-2 gap-3">
                      <a href={activePlace.url} target="_blank" className="flex flex-col items-center gap-3 p-6 rounded-[2.5rem] bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xl active:scale-95 group">
                        <Navigation className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Grounded Route</span>
                      </a>
                      <button onClick={() => sharePlace(activePlace)} className="flex flex-col items-center gap-3 p-6 rounded-[2.5rem] bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all border border-gray-100 active:scale-95">
                        <Share2 className="w-6 h-6 text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Share Vibe</span>
                      </button>
                    </div>

                    <section>
                      <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Current Reality
                      </h3>
                      <div className="p-6 bg-white rounded-[2.5rem] border-2 border-indigo-50 shadow-sm">
                         <p className="text-gray-900 font-bold leading-relaxed text-sm">{activePlace.address}</p>
                      </div>
                    </section>

                    <section className="pb-12">
                      <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Grounded Sentiments
                      </h3>
                      <div className="space-y-4">
                        {(activePlace.reviewSnippets || []).map((s, i) => (
                          <div key={i} className="bg-gray-50/50 p-5 rounded-[2rem] border border-gray-100 italic font-medium text-sm text-gray-600">
                             "{s.text}"
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- RIGHT: MAP AREA --- */}
        <div className="flex-grow h-full relative z-0">
          
          {/* Map Feature Overlays */}
          <div className="absolute top-6 right-6 z-40 flex flex-col gap-4">
            
            {/* Theme & Layer Controls */}
            <div className="bg-white/80 backdrop-blur-xl p-2 rounded-3xl shadow-2xl border border-white flex flex-col gap-2">
              <button onClick={() => setMapTheme('voyager')} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${mapTheme === 'voyager' ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-gray-500 hover:bg-white'}`}>
                <MapIcon className="w-5 h-5" />
              </button>
              <button onClick={() => setMapTheme('dark')} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${mapTheme === 'dark' ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-gray-500 hover:bg-white'}`}>
                <Moon className="w-5 h-5" />
              </button>
              <button onClick={() => setMapTheme('positron')} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${mapTheme === 'positron' ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-gray-500 hover:bg-white'}`}>
                <Sun className="w-5 h-5" />
              </button>
            </div>

            {/* Co-Pilot Status */}
            {isCoPilotActive && (
              <div className="bg-indigo-600 text-white p-4 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 max-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-rose-400 rounded-full animate-ping"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Co-Pilot Listening</span>
                </div>
                <p className="text-xs font-bold leading-snug">"Try: Tell me about the best viewpoint nearby."</p>
              </div>
            )}
          </div>

          <Map 
            places={displayedPlaces} 
            userLocation={userLocation} 
            selectedPlace={selectedPlace}
            onPlaceSelect={setSelectedPlace}
            theme={mapTheme}
          />

          {/* ITINERARY DRAWER OVERLAY */}
          {showItinerary && (
            <div className="absolute inset-y-0 right-0 w-full md:w-96 bg-white/95 backdrop-blur-2xl z-50 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] border-l border-white animate-in slide-in-from-right-full duration-700 flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase italic">Grounded Itinerary</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Optimized Day Trip</p>
                </div>
                <button onClick={() => setShowItinerary(false)} className="p-2.5 hover:bg-gray-100 rounded-2xl transition-all"><X /></button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {itineraryLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Calculating Optimal Path...</p>
                  </div>
                ) : itinerary.map((step, idx) => (
                  <div key={idx} className="relative pl-10 border-l-2 border-dashed border-indigo-100 py-2">
                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black border-4 border-white shadow-md">
                      {idx + 1}
                    </div>
                    <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 hover:shadow-lg transition-all">
                       <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{step.time}</p>
                       <h4 className="font-black text-gray-900 leading-tight mb-2">{step.placeName}</h4>
                       <p className="text-xs text-gray-600 font-medium leading-relaxed">{step.activity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t bg-gray-50/50">
                <button className="w-full bg-indigo-600 text-white py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 active:scale-95 transition-all">
                  Export to Maps
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
