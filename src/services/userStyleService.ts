// services/userStyleService.ts

import { 
    Style, 
    UserStyle, 
    UserStylesResponse,
    AddUserStyleRequest, 
    UpdateUserStylesRequest,
    UserStyleStats,
    StyleWithSelection,
    USER_STYLE_CONSTANTS
  } from '../types/userStyle';
  import { apiClient } from './base';
  
  // UserStyle endpoints
  const ENDPOINTS = {
    USER_STYLES: (userId: number) => `/api/UserStyle/user/${userId}`,
    ADD_USER_STYLE: '/api/UserStyle',
    REMOVE_USER_STYLE: (userId: number, styleId: number) => `/api/UserStyle/user/${userId}/style/${styleId}`,
    UPDATE_USER_STYLES: (userId: number) => `/api/UserStyle/user/${userId}`,
    USER_RECOMMENDATIONS: (userId: number, count?: number) => `/api/UserStyle/user/${userId}/recommendations${count ? `?count=${count}` : ''}`,
    USER_PHOTOGRAPHERS: (userId: number, count?: number) => `/api/UserStyle/user/${userId}/photographers${count ? `?count=${count}` : ''}`,
    CHECK_USER_STYLE: (userId: number, styleId: number) => `/api/UserStyle/user/${userId}/style/${styleId}/check`,
    STYLE_USERS: (styleId: number) => `/api/UserStyle/style/${styleId}/users`,
    // Style endpoints (from Style API)
    ALL_STYLES: '/api/Style',
    STYLE_BY_ID: (id: number) => `/api/Style/${id}`,
    POPULAR_STYLES: (count?: number) => `/api/Style/popular${count ? `?count=${count}` : ''}`,
    STYLES_WITH_COUNT: '/api/Style/with-count',
  };
  
  export class UserStyleService {
  
    // ===== USER STYLE MANAGEMENT =====
  
    // Get user's styles
    async getUserStyles(userId: number): Promise<UserStyle[]> {
      console.log('🎨 Fetching user styles for userId:', userId);
      try {
        const result = await apiClient.get<UserStylesResponse>(ENDPOINTS.USER_STYLES(userId));
        console.log('✅ User styles API response:', result);
        
        // Extract favoriteStyles array from response
        if (result && result.favoriteStyles && Array.isArray(result.favoriteStyles)) {
          console.log('✅ User styles loaded:', result.favoriteStyles.length, 'styles');
          return result.favoriteStyles;
        }
        
        // Handle case where API returns different structure
        if (Array.isArray(result)) {
          console.log('✅ User styles loaded (direct array):', result.length, 'styles');
          return result;
        }
        
        console.warn('⚠️ API returned unexpected format for user styles:', result);
        return [];
        
      } catch (error) {
        console.error('❌ Error fetching user styles:', error);
        // Return empty array on error to prevent crashes
        return [];
      }
    }
  
    // Add a style to user
    async addUserStyle(userId: number, styleId: number): Promise<void> {
      console.log('➕ Adding style to user:', { userId, styleId });
      try {
        const request: AddUserStyleRequest = { userId, styleId };
        await apiClient.post<void>(ENDPOINTS.ADD_USER_STYLE, request);
        console.log('✅ Style added successfully');
      } catch (error) {
        console.error('❌ Error adding user style:', error);
        throw error;
      }
    }
  
    // Remove a style from user
    async removeUserStyle(userId: number, styleId: number): Promise<void> {
      console.log('➖ Removing style from user:', { userId, styleId });
      try {
        await apiClient.delete<void>(ENDPOINTS.REMOVE_USER_STYLE(userId, styleId));
        console.log('✅ Style removed successfully');
      } catch (error) {
        console.error('❌ Error removing user style:', error);
        throw error;
      }
    }
  
    // Update user's styles (replace all)
    async updateUserStyles(userId: number, styleIds: number[]): Promise<void> {
      console.log('🔄 Updating user styles:', { userId, styleIds });
      
      // Validate style count
      if (styleIds.length > USER_STYLE_CONSTANTS.MAX_STYLES_PER_USER) {
        throw new Error(`Cannot add more than ${USER_STYLE_CONSTANTS.MAX_STYLES_PER_USER} styles`);
      }
  
      try {
        await apiClient.put<void>(ENDPOINTS.UPDATE_USER_STYLES(userId), styleIds);
        console.log('✅ User styles updated successfully');
      } catch (error) {
        console.error('❌ Error updating user styles:', error);
        throw error;
      }
    }
  
    // Check if user has a specific style
    async checkUserHasStyle(userId: number, styleId: number): Promise<boolean> {
      try {
        const result = await apiClient.get<boolean>(ENDPOINTS.CHECK_USER_STYLE(userId, styleId));
        return result;
      } catch (error) {
        console.error('❌ Error checking user style:', error);
        return false;
      }
    }
  
    // ===== STYLE MANAGEMENT =====
  
    // Get all available styles
    async getAllStyles(): Promise<Style[]> {
      console.log('🎨 Fetching all styles...');
      try {
        const result = await apiClient.get<Style[]>(ENDPOINTS.ALL_STYLES);
        console.log('✅ All styles loaded:', result.length, 'styles');
        return result;
      } catch (error) {
        console.error('❌ Error fetching styles:', error);
        throw error;
      }
    }
  
    // Get style by ID
    async getStyleById(styleId: number): Promise<Style> {
      try {
        return await apiClient.get<Style>(ENDPOINTS.STYLE_BY_ID(styleId));
      } catch (error) {
        console.error('❌ Error fetching style by ID:', error);
        throw error;
      }
    }
  
    // Get popular styles
    async getPopularStyles(count: number = 10): Promise<Style[]> {
      try {
        return await apiClient.get<Style[]>(ENDPOINTS.POPULAR_STYLES(count));
      } catch (error) {
        console.error('❌ Error fetching popular styles:', error);
        throw error;
      }
    }
  
    // Get styles with usage count
    async getStylesWithCount(): Promise<Style[]> {
      try {
        return await apiClient.get<Style[]>(ENDPOINTS.STYLES_WITH_COUNT);
      } catch (error) {
        console.error('❌ Error fetching styles with count:', error);
        throw error;
      }
    }
  
    // ===== RECOMMENDATIONS & DISCOVERY =====
  
    // Get style recommendations for user
    async getUserRecommendations(userId: number, count: number = 10): Promise<Style[]> {
      try {
        return await apiClient.get<Style[]>(ENDPOINTS.USER_RECOMMENDATIONS(userId, count));
      } catch (error) {
        console.error('❌ Error fetching user recommendations:', error);
        throw error;
      }
    }
  
    // Get photographers based on user's styles
    async getPhotographersByUserStyles(userId: number, count: number = 10): Promise<any[]> {
      try {
        return await apiClient.get<any[]>(ENDPOINTS.USER_PHOTOGRAPHERS(userId, count));
      } catch (error) {
        console.error('❌ Error fetching photographers by user styles:', error);
        throw error;
      }
    }
  
    // Get users who have a specific style
    async getUsersByStyle(styleId: number): Promise<any[]> {
      try {
        return await apiClient.get<any[]>(ENDPOINTS.STYLE_USERS(styleId));
      } catch (error) {
        console.error('❌ Error fetching users by style:', error);
        throw error;
      }
    }
  
    // ===== HELPER METHODS =====
  
    // Get styles with selection status for a user
    async getStylesWithSelection(userId: number): Promise<StyleWithSelection[]> {
      try {
        const [allStyles, userStyles] = await Promise.all([
          this.getAllStyles(),
          this.getUserStyles(userId)
        ]);
  
        const userStyleIds = userStyles.map(us => us.styleId);
  
        return allStyles.map(style => ({
          ...style,
          isSelected: userStyleIds.includes(style.styleId)
        }));
      } catch (error) {
        console.error('❌ Error getting styles with selection:', error);
        throw error;
      }
    }
  
    // Get user style statistics
    async getUserStyleStats(userId: number): Promise<UserStyleStats> {
      try {
        const userStyles = await this.getUserStyles(userId);
        const totalStyles = userStyles.length;
        const maxStyles = USER_STYLE_CONSTANTS.MAX_STYLES_PER_USER;
        const availableSlots = Math.max(0, maxStyles - totalStyles);
        const canAddMore = availableSlots > 0;
  
        return {
          totalStyles,
          availableSlots,
          canAddMore,
          maxStyles
        };
      } catch (error) {
        console.error('❌ Error getting user style stats:', error);
        throw error;
      }
    }
  
    // Bulk operations
    async syncUserStyles(userId: number, currentStyleIds: number[], newStyleIds: number[]): Promise<void> {
      try {
        // Find styles to add and remove
        const stylesToAdd = newStyleIds.filter(id => !currentStyleIds.includes(id));
        const stylesToRemove = currentStyleIds.filter(id => !newStyleIds.includes(id));
  
        console.log('🔄 Syncing user styles:', {
          userId,
          stylesToAdd,
          stylesToRemove,
          currentCount: currentStyleIds.length,
          newCount: newStyleIds.length
        });
  
        // Remove old styles
        for (const styleId of stylesToRemove) {
          await this.removeUserStyle(userId, styleId);
        }
  
        // Add new styles
        for (const styleId of stylesToAdd) {
          await this.addUserStyle(userId, styleId);
        }
  
        console.log('✅ User styles synced successfully');
      } catch (error) {
        console.error('❌ Error syncing user styles:', error);
        throw error;
      }
    }
  
    // Validation helpers
    validateStyleCount(styleIds: number[]): { isValid: boolean; error?: string } {
      if (styleIds.length > USER_STYLE_CONSTANTS.MAX_STYLES_PER_USER) {
        return {
          isValid: false,
          error: `Không thể chọn quá ${USER_STYLE_CONSTANTS.MAX_STYLES_PER_USER} sở thích`
        };
      }
  
      if (styleIds.length < USER_STYLE_CONSTANTS.MIN_STYLES_PER_USER) {
        return {
          isValid: false,
          error: `Cần chọn ít nhất ${USER_STYLE_CONSTANTS.MIN_STYLES_PER_USER} sở thích`
        };
      }
  
      return { isValid: true };
    }
  
    // Get style names from IDs
    async getStyleNamesByIds(styleIds: number[]): Promise<string[]> {
      try {
        const allStyles = await this.getAllStyles();
        return styleIds
          .map(id => {
            const style = allStyles.find(s => s.styleId === id);
            return style?.name;
          })
          .filter(Boolean) as string[];
      } catch (error) {
        console.error('❌ Error getting style names:', error);
        return [];
      }
    }
  
    // Format user styles for display
    formatUserStylesForDisplay(userStyles: UserStyle[]): string {
      if (userStyles.length === 0) {
        return 'Chưa chọn sở thích nào';
      }
  
      const names = userStyles.map(us => us.styleName).join(', ');
      return names;
    }
  
    // Check if user can add more styles
    async canUserAddMoreStyles(userId: number): Promise<boolean> {
      try {
        const stats = await this.getUserStyleStats(userId);
        return stats.canAddMore;
      } catch (error) {
        console.error('❌ Error checking if user can add more styles:', error);
        return false;
      }
    }
  }
  
  // Export singleton instance
  export const userStyleService = new UserStyleService();