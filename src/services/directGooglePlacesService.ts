export interface GooglePlaceResult {
  placeId: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  types?: string[];
  photoReference?: string;
  distance?: number; // Distance from search center in km
}

// 🔧 Define interface cho search results
export interface SearchPlacesResult {
  appLocations: any[]; // hoặc define interface cụ thể cho app locations
  googlePlaces: GooglePlaceResult[];
}

const GOOGLE_API_KEY = 'AIzaSyBvciLV21VOf-c-x9un3DCxY--_UKvqw6Q'

class DirectGooglePlacesService {
  private apiKey: string;
  private autocompleteUrl = 'https://places.googleapis.com/v1/places:autocomplete';
  private nearbySearchUrl = 'https://places.googleapis.com/v1/places:searchNearby'; // 🆕 NEW
  private legacyApiBaseUrl = 'https://maps.googleapis.com/maps/api/place';
  private detailsCache = new Map<string, { latitude: number; longitude: number }>();

  constructor() {
    this.apiKey = GOOGLE_API_KEY;
    
    console.log('🚀 Google Places Service Initializing...');
    console.log('🔧 Environment Debug:', {
      hasApiKey: !!this.apiKey,
      keyLength: this.apiKey?.length || 0,
      keyPreview: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'MISSING',
    });
    
    if (!this.apiKey) {
      console.error('❌ Google Places API key not found!');
    } else {
      console.log('✅ Google Places API key loaded');
    }
  }

  // 🆕 NEARBY SEARCH API - Search places near a location
  async searchNearby(params: {
    latitude: number;
    longitude: number;
    radius?: number; // radius in meters (max 50000)
    maxResultCount?: number;
    includedTypes?: string[];
    excludedTypes?: string[];
    languageCode?: string;
    regionCode?: string;
  }): Promise<GooglePlaceResult[]> {
    try {
      if (!this.apiKey) {
        console.error('❌ Cannot search nearby: API key missing');
        return [];
      }

      const {
        latitude,
        longitude,
        radius = 5000, // Default 5km
        maxResultCount = 20,
        includedTypes = ['tourist_attraction', 'park', 'museum', 'cafe', 'restaurant'],
        excludedTypes = [],
        languageCode = 'vi',
        regionCode = 'VN'
      } = params;

      console.log('🔍 NEARBY SEARCH API:', {
        location: { latitude, longitude },
        radius,
        maxResultCount,
        includedTypes: includedTypes.length,
        excludedTypes: excludedTypes.length
      });

      // 🆕 Nearby Search request body
      const requestBody: any = {
        includedTypes: includedTypes,
        maxResultCount: Math.min(maxResultCount, 20), // API limit is 20
        locationRestriction: {
          circle: {
            center: {
              latitude: latitude,
              longitude: longitude,
            },
            radius: Math.min(radius, 50000), // Max 50km
          },
        },
        languageCode: languageCode,
        regionCode: regionCode,
      };

      // Add excluded types if provided
      if (excludedTypes.length > 0) {
        requestBody.excludedTypes = excludedTypes;
      }

      console.log('🌐 NEARBY SEARCH Request:', {
        url: this.nearbySearchUrl,
        center: { latitude, longitude },
        radius: requestBody.locationRestriction.circle.radius,
        includedTypes: requestBody.includedTypes,
        maxResults: requestBody.maxResultCount
      });

      const response = await fetch(this.nearbySearchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types,places.photos,places.primaryType',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 NEARBY SEARCH Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ NEARBY SEARCH Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 NEARBY SEARCH Response:', {
        placesCount: data.places?.length || 0,
        hasPlaces: !!data.places,
      });

      if (data.places && Array.isArray(data.places)) {
        const transformedResults = this.transformNearbyResults(data.places, { latitude, longitude });
        console.log('✅ NEARBY SEARCH successful:', transformedResults.length, 'places found');
        
        return transformedResults;
      } else {
        console.warn('⚠️ NEARBY SEARCH: No places in response');
        return [];
      }

    } catch (error) {
      console.error('❌ NEARBY SEARCH failed:', error);
      return [];
    }
  }

  // 🔄 Transform nearby search results
  private transformNearbyResults(
    places: any[], 
    searchCenter: { latitude: number; longitude: number }
  ): GooglePlaceResult[] {
    console.log('🔄 Transforming nearby search results:', places.length);
    
    const results: GooglePlaceResult[] = [];
    
    for (const place of places) {
      try {
        // Skip places without essential data
        if (!place.id || !place.location?.latitude || !place.location?.longitude) {
          console.warn('⚠️ Skipping place without ID or location');
          continue;
        }

        // Calculate distance from search center
        const distance = this.calculateDistance(
          searchCenter.latitude,
          searchCenter.longitude,
          place.location.latitude,
          place.location.longitude
        );

        const result: GooglePlaceResult = {
          placeId: place.id,
          name: place.displayName?.text || 'Unknown Place',
          address: place.formattedAddress || '',
          latitude: place.location.latitude,
          longitude: place.location.longitude,
          rating: place.rating,
          types: place.types || [],
          photoReference: place.photos?.[0]?.name || '', // Photo name for New API
          distance: distance,
        };

        results.push(result);
        
        console.log(`✅ Added nearby place: ${result.name} (${result.distance}km)`);
        
      } catch (error) {
        console.error('❌ Error processing nearby place:', error);
      }
    }

    // Sort by distance
    results.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    console.log(`🎯 Final nearby results: ${results.length} places sorted by distance`);
    return results;
  }

  // 📐 Calculate distance between two points in km
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // 🆕 PLACE DETAILS API - Get coordinates for a place
  async getPlaceDetails(placeId: string): Promise<{ latitude: number; longitude: number; photoReference?: string } | null> {
    try {
      // Check cache first
      if (this.detailsCache.has(placeId)) {
        console.log('📦 Using cached coordinates for:', placeId);
        return this.detailsCache.get(placeId)!;
      }

      console.log('🔍 Fetching place details for:', placeId);

      const fields = 'geometry,photos';
      const url = `${this.legacyApiBaseUrl}/details/json?place_id=${placeId}&fields=${fields}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📡 Place Details response:', {
        status: data.status,
        hasGeometry: !!data.result?.geometry,
        hasPhotos: !!data.result?.photos?.length
      });
      
      if (data.status === 'OK' && data.result?.geometry?.location) {
        const details = {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
          photoReference: data.result.photos?.[0]?.photo_reference,
        };
        
        // Cache for future use
        this.detailsCache.set(placeId, details);
        
        console.log('✅ Place details retrieved:', {
          placeId: placeId.substring(0, 20) + '...',
          lat: details.latitude,
          lng: details.longitude,
          hasPhoto: !!details.photoReference
        });
        
        return details;
      } else {
        console.warn('⚠️ Place details error:', data.status, data.error_message);
        return null;
      }
      
    } catch (error) {
      console.error('❌ Failed to get place details:', error);
      return null;
    }
  }

  // 🆕 AUTOCOMPLETE API - Main search method
  async autocompleteSearch(input: string, location?: { lat: number; lng: number }): Promise<GooglePlaceResult[]> {
    try {
      if (!this.apiKey) {
        console.error('❌ Cannot autocomplete: API key missing');
        return [];
      }

      if (!input || input.trim().length < 2) {
        console.log('⚠️ Input too short for autocomplete');
        return [];
      }

      console.log('🔍 AUTOCOMPLETE API search:', { input, hasLocation: !!location });

      // 🆕 Autocomplete request body
      const requestBody: any = {
        input: input.trim(),
        languageCode: 'vi',
        regionCode: 'VN',
        includedPrimaryTypes: [
          'establishment',
          'tourist_attraction', 
          'park',
          'cafe',
          'art_gallery',
        ],
        includeQueryPredictions: false, 
      };

      // Add location bias if provided
      if (location) {
        console.log('📍 Using location bias:', location);
        requestBody.locationBias = {
          circle: {
            center: {
              latitude: location.lat,
              longitude: location.lng,
            },
            radius: 50000, // 50km radius
          },
        };
      }

      console.log('🌐 AUTOCOMPLETE Request:', {
        url: this.autocompleteUrl,
        input: input.trim(),
        hasLocationBias: !!location,
        regionCode: 'VN'
      });

      const response = await fetch(this.autocompleteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 AUTOCOMPLETE Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ AUTOCOMPLETE Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 AUTOCOMPLETE Response:', {
        suggestionsCount: data.suggestions?.length || 0,
        hasPlacePredictions: !!data.suggestions?.some((s: any) => s.placePrediction),
      });

      if (data.suggestions && Array.isArray(data.suggestions)) {
        const transformedResults = await this.transformAutocompleteResults(data.suggestions);
        console.log('✅ AUTOCOMPLETE successful:', transformedResults.length, 'suggestions');
        
        return transformedResults;
      } else {
        console.warn('⚠️ AUTOCOMPLETE: No suggestions in response');
        return [];
      }

    } catch (error) {
      console.error('❌ AUTOCOMPLETE search failed:', error);
      return [];
    }
  }

  // 🔄 Transform autocomplete results with coordinates
  private async transformAutocompleteResults(suggestions: any[]): Promise<GooglePlaceResult[]> {
    console.log('🔄 Transforming autocomplete suggestions:', suggestions.length);
    
    const results: GooglePlaceResult[] = [];
    const maxResults = 6; // Limit results to avoid too many API calls
    
    // Filter only place predictions
    const placePredictions = suggestions
      .filter(s => s.placePrediction)
      .slice(0, maxResults);
    
    console.log(`📋 Processing ${placePredictions.length} place predictions...`);

    // Process each place prediction
    for (const suggestion of placePredictions) {
      try {
        const prediction = suggestion.placePrediction;
        
        // Skip if no place ID
        if (!prediction.placeId) {
          console.warn('⚠️ Skipping prediction without placeId');
          continue;
        }

        console.log(`🔍 Processing place: ${prediction.structuredFormat?.mainText?.text || prediction.text?.text}`);

        // Get place details for coordinates
        const details = await this.getPlaceDetails(prediction.placeId);
        
        const result: GooglePlaceResult = {
          placeId: prediction.placeId,
          name: prediction.structuredFormat?.mainText?.text || prediction.text?.text || 'Unknown Place',
          address: prediction.structuredFormat?.secondaryText?.text || prediction.text?.text || '',
          types: prediction.types || [],
          latitude: details?.latitude,
          longitude: details?.longitude,
          photoReference: details?.photoReference || '',
        };
        
        // Only add places with valid coordinates
        if (result.latitude && result.longitude) {
          results.push(result);
          console.log(`✅ Added place with coordinates: ${result.name}`);
        } else {
          console.warn(`⚠️ Skipping place without coordinates: ${result.name}`);
        }
        
      } catch (error) {
        console.error('❌ Error processing prediction:', error);
      }
    }

    console.log(`🎯 Final autocomplete results: ${results.length} places with coordinates`);
    return results;
  }

  // 🔄 LEGACY API - Text Search (Fallback)
  async textSearchLegacy(query: string, location?: { lat: number; lng: number }): Promise<GooglePlaceResult[]> {
    try {
      if (!this.apiKey) {
        console.error('❌ Cannot search: API key missing');
        return [];
      }

      console.log('🔍 LEGACY API - Text search:', { query, hasLocation: !!location });

      const params = new URLSearchParams({
        query: query,
        key: this.apiKey,
        language: 'vi',
        region: 'vn',
        type: 'establishment',
      });

      if (location) {
        params.append('location', `${location.lat},${location.lng}`);
        params.append('radius', '50000');
      }

      const url = `${this.legacyApiBaseUrl}/textsearch/json?${params}`;
      const safeUrl = url.replace(this.apiKey, 'HIDDEN_API_KEY');
      console.log('🌐 LEGACY API Request URL:', safeUrl);
      
      const response = await fetch(url);
      console.log('📡 LEGACY API Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 LEGACY API Response:', {
        status: data.status,
        resultsCount: data.results?.length || 0,
        errorMessage: data.error_message
      });

      if (data.status === 'OK') {
        const transformedResults = this.transformLegacyApiResults(data.results);
        console.log('✅ LEGACY API search successful:', transformedResults.length, 'places found');
        return transformedResults.slice(0, 8); // Limit results
      } else {
        console.warn('⚠️ LEGACY API error:', data.status, data.error_message);
        this.handleApiError(data.status, data.error_message);
        return [];
      }

    } catch (error) {
      console.error('❌ LEGACY API text search failed:', error);
      return [];
    }
  }

  // 🔄 Transform LEGACY API results
  private transformLegacyApiResults(results: any[]): GooglePlaceResult[] {
    console.log('🔄 Transforming LEGACY API results:', results.length);
    
    return results
      .filter(place => place.geometry?.location?.lat && place.geometry?.location?.lng) // ✅ Only places with coordinates
      .map((place, index) => {
        const transformed: GooglePlaceResult = {
          placeId: place.place_id,
          name: place.name,
          address: place.formatted_address || '',
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          rating: place.rating,
          types: place.types || [],
          photoReference: place.photos?.[0]?.photo_reference,
        };

        if (index < 3) {
          console.log(`🔍 LEGACY API Place ${index + 1}:`, {
            name: transformed.name,
            hasCoords: !!(transformed.latitude && transformed.longitude),
            rating: transformed.rating
          });
        }
        
        return transformed;
      });
  }

  // 🤖 Smart Text Search - Try AUTOCOMPLETE first, fallback to LEGACY
  async textSearch(query: string, location?: { lat: number; lng: number }): Promise<GooglePlaceResult[]> {
    console.log('🤖 Smart search starting for:', query);
    
    // Try AUTOCOMPLETE API first
    console.log('🎯 Step 1: Trying AUTOCOMPLETE API...');
    const autocompleteResults = await this.autocompleteSearch(query, location);
    
    if (autocompleteResults.length > 0) {
      console.log('✅ AUTOCOMPLETE successful, returning', autocompleteResults.length, 'results');
      return autocompleteResults;
    }

    console.log('🔄 Step 2: AUTOCOMPLETE returned no results, trying LEGACY API...');
    
    // Fallback to LEGACY API
    const legacyResults = await this.textSearchLegacy(query, location);
    if (legacyResults.length > 0) {
      console.log('✅ LEGACY API successful, returning', legacyResults.length, 'results');
      return legacyResults;
    }

    console.log('❌ Both APIs returned no results for:', query);
    return [];
  }

  // 🖼️ Get photo URL from photo reference (Legacy API)
  getPhotoUrl(photoReference: string, maxWidth: number = 600): string {
    if (!photoReference || !this.apiKey) {
      return '';
    }
    
    return `${this.legacyApiBaseUrl}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${this.apiKey}`;
  }

  // 🆕 Get photo URL for New Places API
  getNewApiPhotoUrl(photoName: string, maxWidth: number = 600): string {
    if (!photoName || !this.apiKey) {
      return '';
    }
    
    // New Places API photo URL format
    return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${this.apiKey}`;
  }

  // 🖼️ Smart photo URL getter - detects API type automatically
  getSmartPhotoUrl(photoReference: string, maxWidth: number = 600): string {
    if (!photoReference) return '';
    
    // If it starts with "places/", it's from New API
    if (photoReference.startsWith('places/')) {
      return this.getNewApiPhotoUrl(photoReference, maxWidth);
    } else {
      // Otherwise, it's from Legacy API
      return this.getPhotoUrl(photoReference, maxWidth);
    }
  }

  // 🚨 Handle API errors
  private handleApiError(status: string, errorMessage?: string): void {
    const errorMap: Record<string, string[]> = {
      'REQUEST_DENIED': [
        '🚫 Request denied - Check:',
        '   • API key is valid',
        '   • Places API is enabled in Google Cloud',
        '   • Billing is set up',
        '   • API key restrictions'
      ],
      'INVALID_REQUEST': [
        '🔧 Invalid request - Check parameters'
      ],
      'OVER_QUERY_LIMIT': [
        '💰 Over query limit - Check billing'
      ],
      'ZERO_RESULTS': [
        '🔍 No results found for this query'
      ]
    };

    const messages = errorMap[status] || [`❌ Unknown error: ${status} - ${errorMessage}`];
    messages.forEach(msg => console.error(msg));
  }

  // 🧹 Clear cache
  clearCache(): void {
    this.detailsCache.clear();
    console.log('🧹 Place details cache cleared');
  }

  // ✅ Service status
  get isReady(): boolean {
    return !!this.apiKey;
  }

  get status() {
    return {
      ready: this.isReady,
      hasApiKey: !!this.apiKey,
      keyLength: this.apiKey?.length || 0,
      apiVersion: 'Nearby Search + Autocomplete + Place Details + Legacy fallback',
      cacheSize: this.detailsCache.size,
    };
  }
}

// 🚀 Export singleton instance
export const directGooglePlaces = new DirectGooglePlacesService();

// 🔍 Search function for SearchBar với autocomplete và coordinates
export async function searchPlacesForSearchBar(
  query: string,
  currentLocation?: { latitude: number; longitude: number } | null
): Promise<SearchPlacesResult> {
  console.log('🔍 SearchBar search started:', {
    query,
    hasCurrentLocation: !!currentLocation,
    serviceReady: directGooglePlaces.isReady
  });

  // 🔧 Explicitly type the results object
  const results: SearchPlacesResult = {
    appLocations: [] as any[],
    googlePlaces: [] as GooglePlaceResult[],
  };

  try {
    if (!directGooglePlaces.isReady) {
      console.error('❌ Service not ready - check API key');
      return results;
    }

    if (!query || query.trim().length < 2) {
      console.warn('⚠️ Query too short');
      return results;
    }

    const location = currentLocation ? 
      { lat: currentLocation.latitude, lng: currentLocation.longitude } : 
      undefined;

    console.log('🔍 Executing smart search with coordinates...');
    const googleResults: GooglePlaceResult[] = await directGooglePlaces.textSearch(query.trim(), location);
    
    // ✅ Filter out results without coordinates
    const validResults = googleResults.filter(place => 
      place.latitude && 
      place.longitude && 
      !place.placeId.startsWith('query_') && // No fake IDs
      !place.types?.includes('search_query') // No search queries
    );
    
    results.googlePlaces = validResults;

    console.log('✅ SearchBar search completed:', {
      query: query.trim(),
      totalGoogleResults: googleResults.length,
      validGoogleResults: validResults.length,
      appLocations: results.appLocations.length,
      sampleResult: validResults[0] ? {
        name: validResults[0].name,
        hasCoords: !!(validResults[0].latitude && validResults[0].longitude)
      } : null
    });

    return results;

  } catch (error) {
    console.error('❌ SearchBar search error:', error);
    return results;
  }
}

// 🆕 NEW: Search nearby places function
export async function searchNearbyPlaces(
  location: { latitude: number; longitude: number },
  options?: {
    radius?: number; // meters, max 50000
    maxResults?: number;
    includedTypes?: string[];
    excludedTypes?: string[];
  }
): Promise<GooglePlaceResult[]> {
  console.log('🗺️ Nearby search started:', {
    location,
    options,
    serviceReady: directGooglePlaces.isReady
  });

  try {
    if (!directGooglePlaces.isReady) {
      console.error('❌ Service not ready - check API key');
      return [];
    }

    const {
      radius = 5000, // 5km default
      maxResults = 20,
      includedTypes = [
        'tourist_attraction',
        'park',
        'museum',
        'cafe',
        'restaurant',
        'art_gallery',
        'church',
        'shopping_mall',
        'amusement_park'
      ],
      excludedTypes = []
    } = options || {};

    console.log('🔍 Executing nearby search...');
    const nearbyResults = await directGooglePlaces.searchNearby({
      latitude: location.latitude,
      longitude: location.longitude,
      radius,
      maxResultCount: maxResults,
      includedTypes,
      excludedTypes,
    });

    console.log('✅ Nearby search completed:', {
      location,
      radius,
      resultsCount: nearbyResults.length,
      sampleResult: nearbyResults[0] ? {
        name: nearbyResults[0].name,
        distance: nearbyResults[0].distance,
        types: nearbyResults[0].types?.slice(0, 3)
      } : null
    });

    return nearbyResults;

  } catch (error) {
    console.error('❌ Nearby search error:', error);
    return [];
  }
}