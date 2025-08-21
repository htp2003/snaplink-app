export interface GooglePlaceResult {
  placeId: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  types?: string[];
  photoReference?: string; // Just reference, not URL
  distance?: number;
}

export interface SearchPlacesResult {
  appLocations: any[];
  googlePlaces: GooglePlaceResult[];
}

// 🆕 Photo cache interface
interface PhotoCache {
  url: string;
  timestamp: number;
  expires: number; 
}

const GOOGLE_API_KEY = 'AIzaSyBvciLV21VOf-c-x9un3DCxY--_UKvqw6Q';
const PHOTO_CACHE_DURATION = 24 * 60 * 60 * 1000; 

class DirectGooglePlacesService {
  private apiKey: string;
  private autocompleteUrl = 'https://places.googleapis.com/v1/places:autocomplete';
  private nearbySearchUrl = 'https://places.googleapis.com/v1/places:searchNearby';
  private legacyApiBaseUrl = 'https://maps.googleapis.com/maps/api/place';
  private detailsCache = new Map<string, { latitude: number; longitude: number }>();
  
  // 🆕 Photo URL cache to minimize API calls
  private photoCache = new Map<string, PhotoCache>();
  
  // 🆕 Track API usage for debugging
  private apiCallCount = {
    autocomplete: 0,
    nearby: 0,
    details: 0,
    photos: 0,
    textSearch: 0
  };

  constructor() {
    this.apiKey = GOOGLE_API_KEY;
    console.log('🚀 Google Places Service with Optimized Photo Loading');
  }

  // 🆕 Get API usage statistics
  getApiUsage() {
    return {
      ...this.apiCallCount,
      total: Object.values(this.apiCallCount).reduce((sum, count) => sum + count, 0),
      cacheSize: this.photoCache.size
    };
  }

  // 🆕 OPTIMIZED PHOTO LOADING - Only when needed
  async getPlacePhotos(
    placeId: string, 
    options: {
      maxWidth?: number;
      maxHeight?: number;
      maxPhotos?: number;
    } = {}
  ): Promise<string[]> {
    try {
      const { maxWidth = 800, maxHeight = 600, maxPhotos = 3 } = options;
      
      console.log('📸 Getting photos for place:', placeId.substring(0, 20) + '...');

      // 🎯 Step 1: Check cache first
      const cacheKey = `${placeId}_${maxWidth}x${maxHeight}`;
      const cached = this.photoCache.get(cacheKey);
      
      if (cached && Date.now() < cached.expires) {
        console.log('💾 Using cached photo URL');
        return [cached.url];
      }

      // 🎯 Step 2: Get place details to find photo references
      console.log('🔍 Fetching place details for photos...');
      
      const fields = 'photos';
      const url = `${this.legacyApiBaseUrl}/details/json?place_id=${placeId}&fields=${fields}&key=${this.apiKey}`;
      
      this.apiCallCount.details++;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Details API failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📄 Place details response:', {
        status: data.status,
        hasPhotos: !!data.result?.photos?.length,
        photoCount: data.result?.photos?.length || 0
      });
      
      if (data.status !== 'OK' || !data.result?.photos?.length) {
        console.warn('⚠️ No photos available for this place');
        return [];
      }

      // 🎯 Step 3: Process photo references and get URLs
      const photos = data.result.photos.slice(0, maxPhotos);
      const photoUrls: string[] = [];
      
      for (const photo of photos) {
        try {
          // Use legacy API for photo URLs (more reliable)
          const photoUrl = this.getPhotoUrl(photo.photo_reference, maxWidth);
          
          if (photoUrl) {
            photoUrls.push(photoUrl);
            
            // 💾 Cache the first photo URL
            if (photoUrls.length === 1) {
              this.photoCache.set(cacheKey, {
                url: photoUrl,
                timestamp: Date.now(),
                expires: Date.now() + PHOTO_CACHE_DURATION
              });
            }
          }
        } catch (error) {
          console.error('Error processing photo:', error);
        }
      }

      console.log('✅ Photos loaded:', {
        placeId: placeId.substring(0, 20) + '...',
        photoCount: photoUrls.length,
        cached: photoUrls.length > 0
      });
      
      return photoUrls;

    } catch (error) {
      console.error('❌ Failed to get place photos:', error);
      return [];
    }
  }

  // 🆕 NEW PLACES API - Photo URL (for future use)
  async getNewApiPhotoUrl(photoName: string, maxWidth: number = 800): Promise<string | null> {
    try {
      if (!photoName || !this.apiKey) {
        return null;
      }

      // Check cache first
      const cacheKey = `new_${photoName}_${maxWidth}`;
      const cached = this.photoCache.get(cacheKey);
      
      if (cached && Date.now() < cached.expires) {
        console.log('💾 Using cached New API photo URL');
        return cached.url;
      }

      // New Places API photo URL
      const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${this.apiKey}`;
      
      this.apiCallCount.photos++;
      
      // Test if URL is accessible
      const response = await fetch(url, { method: 'HEAD' });
      
      if (response.ok) {
        // Cache the URL
        this.photoCache.set(cacheKey, {
          url: url,
          timestamp: Date.now(),
          expires: Date.now() + PHOTO_CACHE_DURATION
        });
        
        console.log('✅ New API photo URL generated');
        return url;
      } else {
        console.warn('⚠️ New API photo URL not accessible');
        return null;
      }

    } catch (error) {
      console.error('❌ Failed to get New API photo URL:', error);
      return null;
    }
  }

  // 🔄 Existing methods remain the same...
  async searchNearby(params: {
    latitude: number;
    longitude: number;
    radius?: number;
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
        radius = 5000,
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
        includedTypes: includedTypes.length
      });

      const requestBody: any = {
        includedTypes: includedTypes,
        maxResultCount: Math.min(maxResultCount, 20),
        locationRestriction: {
          circle: {
            center: { latitude, longitude },
            radius: Math.min(radius, 50000),
          },
        },
        languageCode,
        regionCode,
      };

      if (excludedTypes.length > 0) {
        requestBody.excludedTypes = excludedTypes;
      }

      this.apiCallCount.nearby++;
      const response = await fetch(this.nearbySearchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types,places.photos,places.primaryType',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ NEARBY SEARCH Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
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

  // 🔄 Transform nearby results - ONLY store photo reference, not URL
  private transformNearbyResults(
    places: any[], 
    searchCenter: { latitude: number; longitude: number }
  ): GooglePlaceResult[] {
    console.log('🔄 Transforming nearby search results:', places.length);
    
    const results: GooglePlaceResult[] = [];
    
    for (const place of places) {
      try {
        if (!place.id || !place.location?.latitude || !place.location?.longitude) {
          console.warn('⚠️ Skipping place without ID or location');
          continue;
        }

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
          // 🎯 ONLY store photo reference, not generate URL yet
          photoReference: place.photos?.[0]?.name || '', 
          distance: distance,
        };

        results.push(result);
        
      } catch (error) {
        console.error('❌ Error processing nearby place:', error);
      }
    }

    results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    return results;
  }

  // 🔄 Existing autocomplete method - also only store references
  async autocompleteSearch(input: string, location?: { lat: number; lng: number }): Promise<GooglePlaceResult[]> {
    try {
      if (!this.apiKey || !input || input.trim().length < 2) {
        return [];
      }

      console.log('🔍 AUTOCOMPLETE API search:', { input, hasLocation: !!location });

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

      if (location) {
        requestBody.locationBias = {
          circle: {
            center: { latitude: location.lat, longitude: location.lng },
            radius: 50000,
          },
        };
      }

      this.apiCallCount.autocomplete++;
      const response = await fetch(this.autocompleteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ AUTOCOMPLETE Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.suggestions && Array.isArray(data.suggestions)) {
        const transformedResults = await this.transformAutocompleteResults(data.suggestions);
        console.log('✅ AUTOCOMPLETE successful:', transformedResults.length, 'suggestions');
        return transformedResults;
      } else {
        return [];
      }

    } catch (error) {
      console.error('❌ AUTOCOMPLETE search failed:', error);
      return [];
    }
  }

  // 🔄 Transform autocomplete results - get coordinates but not photos yet
  private async transformAutocompleteResults(suggestions: any[]): Promise<GooglePlaceResult[]> {
    console.log('🔄 Transforming autocomplete suggestions:', suggestions.length);
    
    const results: GooglePlaceResult[] = [];
    const maxResults = 6;
    
    const placePredictions = suggestions
      .filter(s => s.placePrediction)
      .slice(0, maxResults);

    for (const suggestion of placePredictions) {
      try {
        const prediction = suggestion.placePrediction;
        
        if (!prediction.placeId) {
          continue;
        }

        // Get coordinates but NOT photos
        const details = await this.getPlaceDetails(prediction.placeId);
        
        const result: GooglePlaceResult = {
          placeId: prediction.placeId,
          name: prediction.structuredFormat?.mainText?.text || prediction.text?.text || 'Unknown Place',
          address: prediction.structuredFormat?.secondaryText?.text || prediction.text?.text || '',
          types: prediction.types || [],
          latitude: details?.latitude,
          longitude: details?.longitude,
          // 🎯 Don't load photos here - only when needed in LocationCardDetail
          photoReference: '', // Will be loaded later if needed
        };
        
        if (result.latitude && result.longitude) {
          results.push(result);
        }
        
      } catch (error) {
        console.error('❌ Error processing prediction:', error);
      }
    }

    return results;
  }

  // 🔄 Existing helper methods...
  async getPlaceDetails(placeId: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      if (this.detailsCache.has(placeId)) {
        return this.detailsCache.get(placeId)!;
      }

      const fields = 'geometry';
      const url = `${this.legacyApiBaseUrl}/details/json?place_id=${placeId}&fields=${fields}&key=${this.apiKey}`;
      
      this.apiCallCount.details++;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.result?.geometry?.location) {
        const details = {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
        };
        
        this.detailsCache.set(placeId, details);
        return details;
      } else {
        return null;
      }
      
    } catch (error) {
      console.error('❌ Failed to get place details:', error);
      return null;
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
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

  // 🖼️ Legacy photo URL method (for photo references from details)
  getPhotoUrl(photoReference: string, maxWidth: number = 600): string {
    if (!photoReference || !this.apiKey) {
      return '';
    }
    return `${this.legacyApiBaseUrl}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${this.apiKey}`;
  }

  // 🧹 Cache management
  clearPhotoCache(): void {
    this.photoCache.clear();
    console.log('🧹 Photo cache cleared');
  }

  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, cache] of this.photoCache.entries()) {
      if (now > cache.expires) {
        this.photoCache.delete(key);
      }
    }
    console.log('🧹 Expired cache entries removed');
  }

  // 📊 Service status with API usage
  get status() {
    return {
      ready: !!this.apiKey,
      hasApiKey: !!this.apiKey,
      keyLength: this.apiKey?.length || 0,
      apiVersion: 'Optimized Photo Loading + Nearby + Autocomplete + Details',
      cacheSize: this.detailsCache.size,
      photoCacheSize: this.photoCache.size,
      apiUsage: this.getApiUsage(),
    };
  }

  // 🔄 Other existing methods (textSearch, etc.) remain the same...
  async textSearch(query: string, location?: { lat: number; lng: number }): Promise<GooglePlaceResult[]> {
    console.log('🤖 Smart search starting for:', query);
    
    const autocompleteResults = await this.autocompleteSearch(query, location);
    
    if (autocompleteResults.length > 0) {
      console.log('✅ AUTOCOMPLETE successful, returning', autocompleteResults.length, 'results');
      return autocompleteResults;
    }

    console.log('🔄 Trying legacy API fallback...');
    return await this.textSearchLegacy(query, location);
  }

  async textSearchLegacy(query: string, location?: { lat: number; lng: number }): Promise<GooglePlaceResult[]> {
    // Implementation remains the same as before...
    try {
      if (!this.apiKey) {
        return [];
      }

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
      
      this.apiCallCount.textSearch++;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.status === 'OK') {
        return this.transformLegacyApiResults(data.results);
      } else {
        return [];
      }

    } catch (error) {
      console.error('❌ Legacy text search failed:', error);
      return [];
    }
  }

  private transformLegacyApiResults(results: any[]): GooglePlaceResult[] {
    return results
      .filter(place => place.geometry?.location?.lat && place.geometry?.location?.lng)
      .map((place) => ({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address || '',
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        rating: place.rating,
        types: place.types || [],
        photoReference: place.photos?.[0]?.photo_reference || '',
      }));
  }
}

// 🚀 Export singleton instance
export const directGooglePlaces = new DirectGooglePlacesService();

// 🔍 Export existing search functions (unchanged)
export async function searchPlacesForSearchBar(
  query: string,
  currentLocation?: { latitude: number; longitude: number } | null
): Promise<SearchPlacesResult> {
  const results: SearchPlacesResult = {
    appLocations: [],
    googlePlaces: [],
  };

  try {
    if (!directGooglePlaces.status.ready || !query || query.trim().length < 2) {
      return results;
    }

    const location = currentLocation ? 
      { lat: currentLocation.latitude, lng: currentLocation.longitude } : 
      undefined;

    const googleResults = await directGooglePlaces.textSearch(query.trim(), location);
    
    const validResults = googleResults.filter(place => 
      place.latitude && 
      place.longitude && 
      !place.placeId.startsWith('query_')
    );
    
    results.googlePlaces = validResults;
    return results;

  } catch (error) {
    console.error('❌ SearchBar search error:', error);
    return results;
  }
}

export async function searchNearbyPlaces(
  location: { latitude: number; longitude: number },
  options?: {
    radius?: number;
    maxResults?: number;
    includedTypes?: string[];
    excludedTypes?: string[];
  }
): Promise<GooglePlaceResult[]> {
  try {
    if (!directGooglePlaces.status.ready) {
      return [];
    }

    const {
      radius = 5000,
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

    return await directGooglePlaces.searchNearby({
      latitude: location.latitude,
      longitude: location.longitude,
      radius,
      maxResultCount: maxResults,
      includedTypes,
      excludedTypes,
    });

  } catch (error) {
    console.error('❌ Nearby search error:', error);
    return [];
  }
}