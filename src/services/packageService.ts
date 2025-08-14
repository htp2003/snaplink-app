// // services/packageService.ts
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const API_BASE_URL = "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

// export interface Package {
//   packageId: number;
//   applicableTo: string;
//   name: string;
//   description: string;
//   price: number;
//   durationDays: number;
//   features: string;
//   createdAt?: string;
//   updatedAt?: string;
// }

// export interface Subscription {
//   subscriptionId: number;
//   packageId: number;
//   photographerId?: number;
//   locationId?: number;
//   startDate: string;
//   endDate: string;
//   status: string;
//   cancelReason?: string;
//   createdAt: string;
//   updatedAt: string;
//   package?: Package;
// }

// export interface SubscribeRequest {
//   packageId: number;
//   photographerId?: number;
//   locationId?: number;
// }

// export interface ApiResponse<T> {
//   error: number;
//   message: string;
//   data: T;
// }

// class PackageService {
//   private async makeRequest<T>(
//     endpoint: string,
//     options: RequestInit = {}
//   ): Promise<T> {
//     try {
//       const fullUrl = `${API_BASE_URL}${endpoint}`;

//       // Get token from storage
//       const token = await this.getAuthToken();

//       const response = await fetch(fullUrl, {
//         headers: {
//           "Content-Type": "application/json",
//           ...(token ? { "Authorization": `Bearer ${token}` } : {}),
//           ...options.headers,
//         },
//         ...options,
//       });

//       console.log(`📡 Package API Response Status: ${response.status} for ${endpoint}`);

//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error(
//           `❌ Package API request failed for ${endpoint}:`,
//           response.status,
//           errorText
//         );
        
//         if (response.status === 401) {
//           throw new Error(`Unauthorized: Token có thể đã hết hạn hoặc không hợp lệ`);
//         }
        
//         throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
//       }

//       const result = await response.json();
//       console.log(`✅ Package API Response Data:`, result);
//       return result;
//     } catch (error) {
//       console.error(`❌ Package API request failed for ${endpoint}:`, error);
//       throw error;
//     }
//   }

//   private async getAuthToken(): Promise<string | null> {
//     try {
//       const possibleKeys = [
//         'authToken',
//         'accessToken', 
//         'token',
//         'jwt',
//         'userToken',
//         'auth_token',
//         'access_token'
//       ];

//       for (const key of possibleKeys) {
//         const token = await AsyncStorage.getItem(key);
//         if (token) {
//           return token;
//         }
//       }
      
//       return null;
//     } catch (error) {
//       console.error("❌ Error getting auth token:", error);
//       return null;
//     }
//   }

//   /**
//    * Get all packages for photographers
//    */
//   async getPhotographerPackages(): Promise<Package[]> {
//     try {
//       const response = await this.makeRequest<ApiResponse<Package[]>>(
//         `/api/Package/GetPackages`,
//         { method: "GET" }
//       );

//       console.log("📦 Packages response:", response);

//       if (response.error === 0 && response.data) {
//         // Filter packages for photographers only
//         const photographerPackages = response.data.filter(
//           pkg => pkg.applicableTo?.toLowerCase() === 'photographer'
//         );
//         return photographerPackages;
//       }
      
//       throw new Error(response.message || 'Failed to fetch packages');
//     } catch (error) {
//       console.error('Error fetching photographer packages:', error);
//       throw error;
//     }
//   }

//   /**
//    * Get a specific package by ID
//    */
//   async getPackageById(packageId: number): Promise<Package> {
//     try {
//       const response = await this.makeRequest<ApiResponse<Package>>(
//         `/api/Package/GetPackage/${packageId}`,
//         { method: "GET" }
//       );
      
//       if (response.error === 0 && response.data) {
//         return response.data;
//       }
      
//       throw new Error(response.message || 'Package not found');
//     } catch (error) {
//       console.error('Error fetching package:', error);
//       throw error;
//     }
//   }

//   /**
//    * Subscribe to a package
//    */
//   async subscribeToPackage(request: SubscribeRequest): Promise<Subscription> {
//     try {
//       const response = await this.makeRequest<ApiResponse<Subscription>>(
//         `/api/Subscription/Subscribe`,
//         {
//           method: "POST",
//           body: JSON.stringify(request),
//         }
//       );
      
//       if (response.error === 0 && response.data) {
//         return response.data;
//       }
      
//       throw new Error(response.message || 'Failed to subscribe to package');
//     } catch (error) {
//       console.error('Error subscribing to package:', error);
//       throw error;
//     }
//   }

//   /**
//    * Get photographer's active subscriptions
//    */
//   async getPhotographerSubscriptions(photographerId: number): Promise<Subscription[]> {
//     try {
//       const response = await this.makeRequest<ApiResponse<Subscription[]>>(
//         `/api/Subscription/Photographer/${photographerId}`,
//         { method: "GET" }
//       );
      
//       if (response.error === 0 && response.data) {
//         return response.data;
//       }
      
//       return [];
//     } catch (error) {
//       console.error('Error fetching photographer subscriptions:', error);
//       throw error;
//     }
//   }

//   /**
//    * Cancel a subscription
//    */
//   async cancelSubscription(subscriptionId: number, reason?: string): Promise<boolean> {
//     try {
//       const url = `/api/Subscription/${subscriptionId}/cancel${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`;
//       const response = await this.makeRequest<ApiResponse<boolean>>(url, {
//         method: "PUT",
//       });
      
//       return response.error === 0;
//     } catch (error) {
//       console.error('Error canceling subscription:', error);
//       throw error;
//     }
//   }

//   /**
//    * Parse features string into array
//    */
//   parseFeatures(featuresString: string): string[] {
//     if (!featuresString) return [];
    
//     // Handle different possible formats
//     try {
//       // Try to parse as JSON array first
//       return JSON.parse(featuresString);
//     } catch {
//       // If not JSON, split by common delimiters
//       return featuresString
//         .split(/[,;|\n]/)
//         .map(feature => feature.trim())
//         .filter(feature => feature.length > 0);
//     }
//   }

//   /**
//    * Format package duration for display
//    */
//   formatDuration(durationDays: number): string {
//     if (durationDays < 7) {
//       return `${durationDays} ngày`;
//     } else if (durationDays < 30) {
//       const weeks = Math.floor(durationDays / 7);
//       const remainingDays = durationDays % 7;
//       if (remainingDays === 0) {
//         return `${weeks} tuần`;
//       } else {
//         return `${weeks} tuần ${remainingDays} ngày`;
//       }
//     } else if (durationDays < 365) {
//       const months = Math.floor(durationDays / 30);
//       const remainingDays = durationDays % 30;
//       if (remainingDays === 0) {
//         return `${months} tháng`;
//       } else {
//         return `${months} tháng ${remainingDays} ngày`;
//       }
//     } else {
//       const years = Math.floor(durationDays / 365);
//       const remainingDays = durationDays % 365;
//       if (remainingDays === 0) {
//         return `${years} năm`;
//       } else {
//         return `${years} năm ${remainingDays} ngày`;
//       }
//     }
//   }

//   /**
//    * Format price for display
//    */
//   formatPrice(price: number): string {
//     return new Intl.NumberFormat('vi-VN', {
//       style: 'currency',
//       currency: 'VND'
//     }).format(price);
//   }

//   /**
//    * Calculate savings if there's a regular price comparison
//    */
//   calculateSavings(originalPrice: number, salePrice: number): { amount: number; percentage: number } {
//     const amount = originalPrice - salePrice;
//     const percentage = Math.round((amount / originalPrice) * 100);
//     return { amount, percentage };
//   }

//   /**
//    * Check if user can afford package
//    */
//   canAffordPackage(packagePrice: number, walletBalance: number): boolean {
//     return walletBalance >= packagePrice;
//   }

//   /**
//    * Get recommended package (could be based on user's profile, most popular, etc.)
//    */
//   getRecommendedPackage(packages: Package[]): Package | null {
//     if (packages.length === 0) return null;
    
//     // For now, return the middle-priced package as recommended
//     // In real app, this could be based on user behavior, popularity, etc.
//     const sortedByPrice = [...packages].sort((a, b) => a.price - b.price);
//     const middleIndex = Math.floor(sortedByPrice.length / 2);
//     return sortedByPrice[middleIndex];
//   }
// }

// export const packageService = new PackageService();locationId?: number;
// }

// export interface ApiResponse<T> {
//   error: number;
//   message: string;
//   data: T;
// }

// class PackageService {
//   /**
//    * Get all packages for photographers
//    */
//   async getPhotographerPackages(): Promise<Package[]> {
//     try {
//       const response = await ApiService.get<ApiResponse<Package[]>>('/Package/GetPackages');
      
//       if (response.data.error === 0 && response.data.data) {
//         // Filter packages for photographers only
//         const photographerPackages = response.data.data.filter(
//           pkg => pkg.applicableTo?.toLowerCase() === 'photographer'
//         );
//         return photographerPackages;
//       }
      
//       throw new Error(response.data.message || 'Failed to fetch packages');
//     } catch (error) {
//       console.error('Error fetching photographer packages:', error);
//       throw error;
//     }
//   }

//   /**
//    * Get a specific package by ID
//    */
//   async getPackageById(packageId: number): Promise<Package> {
//     try {
//       const response = await ApiService.get<ApiResponse<Package>>(`/Package/GetPackage/${packageId}`);
      
//       if (response.data.error === 0 && response.data.data) {
//         return response.data.data;
//       }
      
//       throw new Error(response.data.message || 'Package not found');
//     } catch (error) {
//       console.error('Error fetching package:', error);
//       throw error;
//     }
//   }

//   /**
//    * Subscribe to a package
//    */
//   async subscribeToPackage(request: SubscribeRequest): Promise<Subscription> {
//     try {
//       const response = await ApiService.post<ApiResponse<Subscription>>('/Subscription/Subscribe', request);
      
//       if (response.data.error === 0 && response.data.data) {
//         return response.data.data;
//       }
      
//       throw new Error(response.data.message || 'Failed to subscribe to package');
//     } catch (error) {
//       console.error('Error subscribing to package:', error);
//       throw error;
//     }
//   }

//   /**
//    * Get photographer's active subscriptions
//    */
//   async getPhotographerSubscriptions(photographerId: number): Promise<Subscription[]> {
//     try {
//       const response = await ApiService.get<ApiResponse<Subscription[]>>(`/Subscription/Photographer/${photographerId}`);
      
//       if (response.data.error === 0 && response.data.data) {
//         return response.data.data;
//       }
      
//       return [];
//     } catch (error) {
//       console.error('Error fetching photographer subscriptions:', error);
//       throw error;
//     }
//   }

//   /**
//    * Cancel a subscription
//    */
//   async cancelSubscription(subscriptionId: number, reason?: string): Promise<boolean> {
//     try {
//       const url = `/Subscription/${subscriptionId}/cancel${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`;
//       const response = await ApiService.put<ApiResponse<boolean>>(url);
      
//       return response.data.error === 0;
//     } catch (error) {
//       console.error('Error canceling subscription:', error);
//       throw error;
//     }
//   }

//   /**
//    * Parse features string into array
//    */
//   parseFeatures(featuresString: string): string[] {
//     if (!featuresString) return [];
    
//     // Handle different possible formats
//     try {
//       // Try to parse as JSON array first
//       return JSON.parse(featuresString);
//     } catch {
//       // If not JSON, split by common delimiters
//       return featuresString
//         .split(/[,;|\n]/)
//         .map(feature => feature.trim())
//         .filter(feature => feature.length > 0);
//     }
//   }

//   /**
//    * Format package duration for display
//    */
//   formatDuration(durationDays: number): string {
//     if (durationDays < 7) {
//       return `${durationDays} ngày`;
//     } else if (durationDays < 30) {
//       const weeks = Math.floor(durationDays / 7);
//       const remainingDays = durationDays % 7;
//       if (remainingDays === 0) {
//         return `${weeks} tuần`;
//       } else {
//         return `${weeks} tuần ${remainingDays} ngày`;
//       }
//     } else if (durationDays < 365) {
//       const months = Math.floor(durationDays / 30);
//       const remainingDays = durationDays % 30;
//       if (remainingDays === 0) {
//         return `${months} tháng`;
//       } else {
//         return `${months} tháng ${remainingDays} ngày`;
//       }
//     } else {
//       const years = Math.floor(durationDays / 365);
//       const remainingDays = durationDays % 365;
//       if (remainingDays === 0) {
//         return `${years} năm`;
//       } else {
//         return `${years} năm ${remainingDays} ngày`;
//       }
//     }
//   }

//   /**
//    * Format price for display
//    */
//   formatPrice(price: number): string {
//     return new Intl.NumberFormat('vi-VN', {
//       style: 'currency',
//       currency: 'VND'
//     }).format(price);
//   }

//   /**
//    * Calculate savings if there's a regular price comparison
//    */
//   calculateSavings(originalPrice: number, salePrice: number): { amount: number; percentage: number } {
//     const amount = originalPrice - salePrice;
//     const percentage = Math.round((amount / originalPrice) * 100);
//     return { amount, percentage };
//   }

//   /**
//    * Check if user can afford package
//    */
//   canAffordPackage(packagePrice: number, walletBalance: number): boolean {
//     return walletBalance >= packagePrice;
//   }

//   /**
//    * Get recommended package (could be based on user's profile, most popular, etc.)
//    */
//   getRecommendedPackage(packages: Package[]): Package | null {
//     if (packages.length === 0) return null;
    
//     // For now, return the middle-priced package as recommended
//     // In real app, this could be based on user behavior, popularity, etc.
//     const sortedByPrice = [...packages].sort((a, b) => a.price - b.price);
//     const middleIndex = Math.floor(sortedByPrice.length / 2);
//     return sortedByPrice[middleIndex];
//   }
// }

// export const packageService = new PackageService();