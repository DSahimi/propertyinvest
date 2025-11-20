import React, { useState } from 'react';
import { Property } from './types';
import { PropertyCard } from './components/PropertyCard';
import { PropertyDetail } from './components/PropertyDetail';
import { LiveAssistant } from './components/LiveAssistant';
import { AddPropertyModal } from './components/AddPropertyModal';
import { fetchListingsByCity, fetchPropertyListing, SearchFilters } from './services/geminiService';
import { Plus, LayoutGrid, Mic, Search, MapPin, Loader2, ArrowLeft, Heart, Home, Filter, SlidersHorizontal } from 'lucide-react';

// Initial Data
const INITIAL_PROPERTIES: Property[] = [
  {
    id: '1',
    address: '1204 Willow Creek Dr, Austin, TX',
    price: 450000,
    images: [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1484154218962-a1c002085d2f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2400,
    downPaymentPercent: 20,
    interestRate: 6.5,
    loanTermYears: 30,
    nightlyRate: 250,
    occupancyRate: 65,
    propertyTax: 8000,
    insurance: 2000,
    managementFeePercent: 25,
    snowRemoval: 0,
    hotTubMaintenance: 150,
    utilities: 300,
    maintenance: 200,
    hoa: 50,
    otherExpenses: 0,
    fairOfferRecommendation: "Based on the strong cash flow and 65% occupancy estimate, the list price of $450k appears fair. A specific offer of $440k might be accepted given market cooling.",
    isFavorite: true
  }
];

function App() {
  const [viewMode, setViewMode] = useState<'home' | 'dashboard'>('home');
  const [properties, setProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_PROPERTIES[0].id);
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all');
  
  // Home Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Search Filters
  const [filters, setFilters] = useState<SearchFilters>({
      minPrice: undefined,
      maxPrice: undefined,
      minBeds: undefined,
      minBaths: undefined,
      minSqft: undefined
  });
  const [showFilters, setShowFilters] = useState(false);

  const handlePropertyUpdate = (updated: Property) => {
    setProperties(properties.map(p => p.id === updated.id ? updated : p));
  };

  const handleAddProperty = (newProperty: Property) => {
    setProperties([newProperty, ...properties]);
    setSelectedId(newProperty.id);
    setViewMode('dashboard');
    setFilterMode('all'); // Switch to all to see the new property
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProperties(properties.map(p => 
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  };

  const handleBackToHome = () => {
      setViewMode('home');
  };

  // Filter properties based on sidebar tab
  const filteredProperties = properties.filter(p => {
      if (filterMode === 'favorites') return p.isFavorite;
      return true;
  });

  // Ensure selected property handles deletion or filtering if needed, but usually we keep it visible or default to first available
  const selectedProperty = properties.find(p => p.id === selectedId) || properties[0];

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    setSearchResults([]);
    
    try {
        // Heuristic: URLs or inputs starting with numbers are likely specific properties
        const isUrl = searchQuery.toLowerCase().includes('http') || searchQuery.toLowerCase().includes('www');
        const isAddress = /^\d+\s/.test(searchQuery); // Starts with digit and space (e.g. 123 Main)

        if (isUrl || isAddress) {
            // Single Property Mode
            const data = await fetchPropertyListing(searchQuery);
            if (data && data.address) {
                 // Adapting the rich data for the grid view + importListing
                 const richResult = {
                     ...data, // Spread all rich fields (tax, hoa, etc)
                     image: data.images?.[0] || '' // For the grid card thumbnail
                 };
                 setSearchResults([richResult]);
            }
        } else {
             // City Mode with Filters
             const results = await fetchListingsByCity(searchQuery, filters);
             setSearchResults(results);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsSearching(false);
    }
  };

  const importListing = async (listing: any) => {
     // Use 'images' array if present (from rich search), otherwise wrap single 'image' (from city search)
     const images = listing.images && listing.images.length > 0 
        ? listing.images 
        : (listing.image ? [listing.image] : []);

     const newProperty: Property = {
        id: Date.now().toString() + Math.random(),
        address: listing.address,
        price: listing.price,
        images: images,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        sqft: listing.sqft,
        
        // Financials
        downPaymentPercent: 20,
        interestRate: 6.8,
        loanTermYears: 30,
        nightlyRate: listing.nightlyRate ?? (listing.price * 0.0005),
        occupancyRate: listing.occupancyRate ?? 55,
        
        // Expenses - Use fetched values if available (from specific address search), else defaults
        propertyTax: listing.propertyTax ?? (listing.price * 0.015), // Default 1.5% if missing
        insurance: listing.insurance ?? (listing.price * 0.004), // Default 0.4% if missing
        managementFeePercent: 25,
        snowRemoval: listing.snowRemoval ?? 0,
        hotTubMaintenance: listing.hotTubMaintenance ?? 0,
        utilities: listing.utilities ?? 300,
        maintenance: 250,
        hoa: listing.hoa ?? 0,
        otherExpenses: 0,
        
        fairOfferRecommendation: listing.fairOfferRecommendation || "Review the expenses to get an accurate analysis.",
        isFavorite: false
     };

     handleAddProperty(newProperty);
  };

  // -- RENDER: DASHBOARD VIEW --
  if (viewMode === 'dashboard') {
    return (
        <div className="h-screen w-screen bg-slate-50 flex overflow-hidden">
          {/* Left Sidebar (List) */}
          <div className="w-full md:w-[400px] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
            <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <div className="bg-indigo-600 p-1.5 rounded-lg">
                    <LayoutGrid size={20} className="text-white" />
                 </div>
                 <h1 className="text-xl font-bold text-slate-800">PropVest AI</h1>
              </div>
              <button 
                onClick={handleBackToHome} 
                className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors" 
                title="Back to Home Search"
              >
                 <Home size={18} /> Home
              </button>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex p-3 gap-2 bg-white border-b border-slate-50">
                <button 
                    onClick={() => setFilterMode('all')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${filterMode === 'all' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    All Properties
                </button>
                <button 
                    onClick={() => setFilterMode('favorites')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${filterMode === 'favorites' ? 'bg-red-50 text-red-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Heart size={14} className={filterMode === 'favorites' ? 'fill-current' : ''} /> Favorites
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {filteredProperties.length === 0 && filterMode === 'favorites' ? (
                   <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                       <Heart size={48} className="mb-4 text-slate-200" />
                       <p>No favorites saved yet.</p>
                       <button onClick={() => setFilterMode('all')} className="text-indigo-600 text-sm mt-2 hover:underline">Browse all properties</button>
                   </div>
               ) : filteredProperties.length === 0 && filterMode === 'all' ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                       <p>No properties found.</p>
                   </div>
               ) : (
                   filteredProperties.map(prop => (
                     <PropertyCard 
                       key={prop.id} 
                       property={prop} 
                       isSelected={prop.id === selectedId}
                       onClick={() => setSelectedId(prop.id)}
                       onToggleFavorite={(e) => handleToggleFavorite(prop.id, e)}
                     />
                   ))
               )}
               
               {filterMode === 'all' && (
                   <button 
                     onClick={() => setIsAddModalOpen(true)}
                     className="w-full border-2 border-dashed border-slate-300 rounded-xl p-4 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 font-medium group"
                   >
                     <div className="bg-slate-100 group-hover:bg-indigo-50 p-2 rounded-full transition-colors">
                       <Plus size={20} />
                     </div>
                     Add New Property
                   </button>
               )}
            </div>
          </div>
    
          {/* Main Content (Detail) */}
          <div className="flex-1 h-full relative hidden md:block">
             {selectedProperty ? (
                 <>
                    <PropertyDetail 
                      property={selectedProperty} 
                      onUpdate={handlePropertyUpdate}
                    />
                    {/* Add a small home button inside property detail too if needed, or rely on sidebar */}
                 </>
             ) : (
                 <div className="h-full flex items-center justify-center text-slate-400">
                     <p>Select a property to view details</p>
                 </div>
             )}
             
             {/* Floating Voice Assistant Button */}
             <button 
               onClick={() => setIsLiveOpen(true)}
               className="absolute bottom-8 right-8 bg-slate-900 text-white p-4 rounded-full shadow-xl hover:bg-slate-800 transition-transform hover:scale-105 z-40 group flex items-center gap-0 overflow-hidden"
             >
                 <Mic size={24} />
                 <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-sm font-medium group-hover:ml-2">
                   Speak to Advisor
                 </span>
             </button>
          </div>
    
          {/* Modals */}
          <LiveAssistant isOpen={isLiveOpen} onClose={() => setIsLiveOpen(false)} />
          <AddPropertyModal 
            isOpen={isAddModalOpen} 
            onClose={() => setIsAddModalOpen(false)} 
            onAdd={handleAddProperty}
          />
        </div>
      );
  }

  // -- RENDER: HOME SEARCH VIEW --
  return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
          {/* Header */}
          <div className="w-full p-6 flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <div className="bg-indigo-600 p-1.5 rounded-lg">
                    <LayoutGrid size={20} className="text-white" />
                 </div>
                 <h1 className="text-xl font-bold text-slate-800">PropVest AI</h1>
              </div>
              <button 
                onClick={() => setViewMode('dashboard')} 
                className="text-slate-600 hover:text-indigo-600 font-medium text-sm flex items-center gap-1"
              >
                  My Dashboard <ArrowLeft size={16} className="rotate-180"/>
              </button>
          </div>

          {/* Hero Content */}
          <div className="flex-1 flex flex-col items-center pt-16 px-4 max-w-6xl mx-auto w-full">
              <h1 className="text-4xl md:text-6xl font-bold text-slate-900 text-center tracking-tight mb-6">
                  Find your next <span className="text-indigo-600">rental investment</span>.
              </h1>
              <p className="text-lg text-slate-500 text-center max-w-2xl mb-10">
                  Search any city to find current listings, or enter a specific address to instantly analyze cash flow, cap rates, and get AI-powered advice.
              </p>

              {/* Search Section */}
              <div className="w-full max-w-3xl space-y-4 mb-16">
                  <div className="relative z-20">
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Enter City, Address, or paste a Listing URL..."
                        className="w-full h-16 pl-14 pr-6 rounded-full shadow-xl border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 text-lg outline-none transition-shadow"
                      />
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                      
                      <button 
                        onClick={handleSearch}
                        disabled={!searchQuery || isSearching}
                        className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 rounded-full font-medium transition-colors disabled:opacity-50 flex items-center"
                      >
                          {isSearching ? <Loader2 className="animate-spin" /> : 'Search'}
                      </button>
                  </div>
                  
                  {/* Filters Button / Bar */}
                  <div className="flex justify-center">
                     <button 
                       onClick={() => setShowFilters(!showFilters)}
                       className="text-indigo-600 text-sm font-medium flex items-center gap-2 hover:bg-indigo-50 px-4 py-2 rounded-full transition-colors"
                     >
                         <SlidersHorizontal size={16} /> 
                         {showFilters ? 'Hide Filters' : 'Show Search Filters'}
                     </button>
                  </div>

                  {showFilters && (
                      <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">Min Price</label>
                              <input 
                                type="number" 
                                placeholder="$0"
                                className="w-full border rounded p-2 text-sm"
                                value={filters.minPrice || ''}
                                onChange={(e) => setFilters({...filters, minPrice: parseInt(e.target.value)})}
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">Max Price</label>
                              <input 
                                type="number" 
                                placeholder="$1,000,000"
                                className="w-full border rounded p-2 text-sm"
                                value={filters.maxPrice || ''}
                                onChange={(e) => setFilters({...filters, maxPrice: parseInt(e.target.value)})}
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">Min Beds</label>
                              <select 
                                className="w-full border rounded p-2 text-sm"
                                value={filters.minBeds || ''}
                                onChange={(e) => setFilters({...filters, minBeds: parseInt(e.target.value)})}
                              >
                                  <option value="">Any</option>
                                  <option value="1">1+</option>
                                  <option value="2">2+</option>
                                  <option value="3">3+</option>
                                  <option value="4">4+</option>
                              </select>
                          </div>
                           <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">Min SqFt</label>
                              <input 
                                type="number" 
                                placeholder="e.g. 1500"
                                className="w-full border rounded p-2 text-sm"
                                value={filters.minSqft || ''}
                                onChange={(e) => setFilters({...filters, minSqft: parseInt(e.target.value)})}
                              />
                          </div>
                      </div>
                  )}
              </div>

              {/* Results Grid */}
              {searchResults.length > 0 && (
                  <div className="w-full space-y-6 pb-20">
                      <h2 className="text-xl font-semibold text-slate-800">
                         {searchResults.length === 1 ? 'Found Property' : `Results for "${searchQuery}"`}
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {searchResults.map((item, idx) => (
                              <div 
                                key={idx}
                                onClick={() => importListing(item)}
                                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
                              >
                                  <div className="h-48 bg-slate-100 relative overflow-hidden">
                                      {item.image ? (
                                          <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.address} />
                                      ) : (
                                          <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                                              <MapPin size={32} />
                                          </div>
                                      )}
                                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                          <p className="text-white font-bold text-lg">${item.price?.toLocaleString()}</p>
                                      </div>
                                  </div>
                                  <div className="p-4">
                                      <h3 className="font-semibold text-slate-800 truncate mb-2">{item.address}</h3>
                                      <div className="flex gap-4 text-sm text-slate-500">
                                          <span>{item.bedrooms} Beds</span>
                                          <span>{item.bathrooms} Baths</span>
                                          <span>{item.sqft?.toLocaleString()} SqFt</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
              
              {/* Empty State / Loading */}
              {isSearching && searchResults.length === 0 && (
                  <div className="text-center text-slate-400 py-20">
                      <Loader2 size={48} className="animate-spin mx-auto mb-4 text-indigo-500" />
                      <p>Scouring the web for real estate listings...</p>
                  </div>
              )}

          </div>
      </div>
  );
}

export default App;