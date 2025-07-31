// hooks/useUserStyle.ts

import { useState, useEffect, useCallback } from 'react';
import { 
  Style, 
  UserStyle, 
  UserStyleStats,
  StyleWithSelection,
  USER_STYLE_CONSTANTS
} from '../types/userStyle';
import { userStyleService } from '../services/userStyleService';

export interface UseUserStyleReturn {
  // Data
  userStyles: UserStyle[];
  allStyles: Style[];
  selectedStyleIds: number[];
  stylesWithSelection: StyleWithSelection[];
  userStyleStats: UserStyleStats | null;
  
  // Loading states
  loading: boolean;
  loadingUserStyles: boolean;
  loadingAllStyles: boolean;
  saving: boolean;
  
  // Error handling
  error: string | null;
  
  // Actions
  loadUserStyles: (userId: number) => Promise<void>;
  loadAllStyles: () => Promise<void>;
  addStyle: (userId: number, styleId: number) => Promise<void>;
  removeStyle: (userId: number, styleId: number) => Promise<void>;
  updateStyles: (userId: number, styleIds: number[]) => Promise<void>;
  syncStyles: (userId: number, newStyleIds: number[]) => Promise<void>;
  toggleStyle: (userId: number, styleId: number) => Promise<void>;
  
  // Utilities
  canAddMoreStyles: boolean;
  getSelectedStyleNames: () => string[];
  getAvailableStyles: () => Style[];
  validateStyleSelection: (styleIds: number[]) => { isValid: boolean; error?: string };
  resetError: () => void;
  refresh: (userId: number) => Promise<void>;
}

export function useUserStyle(): UseUserStyleReturn {
  // State
  const [userStyles, setUserStyles] = useState<UserStyle[]>([]);
  const [allStyles, setAllStyles] = useState<Style[]>([]);
  const [selectedStyleIds, setSelectedStyleIds] = useState<number[]>([]);
  const [stylesWithSelection, setStylesWithSelection] = useState<StyleWithSelection[]>([]);
  const [userStyleStats, setUserStyleStats] = useState<UserStyleStats | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingUserStyles, setLoadingUserStyles] = useState(false);
  const [loadingAllStyles, setLoadingAllStyles] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Error handling
  const [error, setError] = useState<string | null>(null);

  // ===== UTILITY FUNCTIONS =====

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const updateSelectedStyleIds = useCallback((styles: UserStyle[]) => {
    if (!Array.isArray(styles)) {
      console.warn('⚠️ updateSelectedStyleIds: styles is not an array', styles);
      setSelectedStyleIds([]);
      return;
    }
    
    const ids = styles.map(style => style.styleId).filter(id => typeof id === 'number');
    setSelectedStyleIds(ids);
    console.log('📝 Updated selected style IDs:', ids);
  }, []);

  const updateStylesWithSelection = useCallback((allStylesData: Style[], userStylesData: UserStyle[]) => {
    if (!Array.isArray(allStylesData) || !Array.isArray(userStylesData)) {
      console.warn('⚠️ updateStylesWithSelection: Invalid array data', {
        allStylesData: Array.isArray(allStylesData),
        userStylesData: Array.isArray(userStylesData)
      });
      setStylesWithSelection([]);
      return;
    }

    const userStyleIds = userStylesData.map(us => us.styleId).filter(id => typeof id === 'number');
    const withSelection = allStylesData.map(style => ({
      ...style,
      isSelected: userStyleIds.includes(style.styleId)
    }));
    setStylesWithSelection(withSelection);
  }, []);

  const updateUserStyleStats = useCallback(async (userId: number) => {
    try {
      const stats = await userStyleService.getUserStyleStats(userId);
      setUserStyleStats(stats);
    } catch (error) {
      console.error('❌ Error updating user style stats:', error);
    }
  }, []);

  // ===== LOAD DATA =====

  const loadUserStyles = useCallback(async (userId: number) => {
    try {
      setLoadingUserStyles(true);
      setError(null);
      
      console.log('📚 Loading user styles for userId:', userId);
      const styles = await userStyleService.getUserStyles(userId);
      
      // Ensure styles is an array
      const stylesArray = Array.isArray(styles) ? styles : [];
      console.log('✅ User styles loaded:', stylesArray.length, 'styles');
      
      setUserStyles(stylesArray);
      updateSelectedStyleIds(stylesArray);
      
      // Update stats
      await updateUserStyleStats(userId);
      
      // Update styles with selection if we have allStyles
      if (allStyles.length > 0) {
        updateStylesWithSelection(allStyles, stylesArray);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user styles';
      console.error('❌ Error loading user styles:', errorMessage);
      setError(errorMessage);
      
      // Set empty arrays on error to prevent crashes
      setUserStyles([]);
      setSelectedStyleIds([]);
    } finally {
      setLoadingUserStyles(false);
    }
  }, [allStyles, updateSelectedStyleIds, updateStylesWithSelection, updateUserStyleStats]);

  const loadAllStyles = useCallback(async () => {
    try {
      setLoadingAllStyles(true);
      setError(null);
      
      console.log('🎨 Loading all styles...');
      const styles = await userStyleService.getAllStyles();
      
      // Ensure styles is an array
      const stylesArray = Array.isArray(styles) ? styles : [];
      console.log('✅ All styles loaded:', stylesArray.length, 'styles');
      
      setAllStyles(stylesArray);
      
      // Update styles with selection if we have userStyles
      if (userStyles.length > 0) {
        updateStylesWithSelection(stylesArray, userStyles);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load styles';
      console.error('❌ Error loading all styles:', errorMessage);
      setError(errorMessage);
      
      // Set empty array on error to prevent crashes
      setAllStyles([]);
    } finally {
      setLoadingAllStyles(false);
    }
  }, [userStyles, updateStylesWithSelection]);

  // ===== STYLE ACTIONS =====

  const addStyle = useCallback(async (userId: number, styleId: number) => {
    try {
      setSaving(true);
      setError(null);
      
      // Validate before adding
      const currentCount = selectedStyleIds.length;
      if (currentCount >= USER_STYLE_CONSTANTS.MAX_STYLES_PER_USER) {
        throw new Error(`Không thể thêm quá ${USER_STYLE_CONSTANTS.MAX_STYLES_PER_USER} sở thích`);
      }

      if (selectedStyleIds.includes(styleId)) {
        throw new Error('Sở thích này đã được chọn');
      }

      console.log('➕ Adding style:', { userId, styleId });
      await userStyleService.addUserStyle(userId, styleId);
      
      // Reload user styles
      await loadUserStyles(userId);
      
      console.log('✅ Style added successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add style';
      console.error('❌ Error adding style:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [selectedStyleIds, loadUserStyles]);

  const removeStyle = useCallback(async (userId: number, styleId: number) => {
    try {
      setSaving(true);
      setError(null);
      
      if (!selectedStyleIds.includes(styleId)) {
        throw new Error('Sở thích này chưa được chọn');
      }

      console.log('➖ Removing style:', { userId, styleId });
      await userStyleService.removeUserStyle(userId, styleId);
      
      // Reload user styles
      await loadUserStyles(userId);
      
      console.log('✅ Style removed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove style';
      console.error('❌ Error removing style:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [selectedStyleIds, loadUserStyles]);

  const updateStyles = useCallback(async (userId: number, styleIds: number[]) => {
    try {
      setSaving(true);
      setError(null);
      
      // Validate style count
      const validation = userStyleService.validateStyleCount(styleIds);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      console.log('🔄 Updating user styles:', { userId, styleIds });
      await userStyleService.updateUserStyles(userId, styleIds);
      
      // Reload user styles
      await loadUserStyles(userId);
      
      console.log('✅ Styles updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update styles';
      console.error('❌ Error updating styles:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [loadUserStyles]);

  const syncStyles = useCallback(async (userId: number, newStyleIds: number[]) => {
    try {
      setSaving(true);
      setError(null);
      
      console.log('🔄 Syncing styles:', { userId, current: selectedStyleIds, new: newStyleIds });
      await userStyleService.syncUserStyles(userId, selectedStyleIds, newStyleIds);
      
      // Reload user styles
      await loadUserStyles(userId);
      
      console.log('✅ Styles synced successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync styles';
      console.error('❌ Error syncing styles:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [selectedStyleIds, loadUserStyles]);

  const toggleStyle = useCallback(async (userId: number, styleId: number) => {
    try {
      if (selectedStyleIds.includes(styleId)) {
        await removeStyle(userId, styleId);
      } else {
        await addStyle(userId, styleId);
      }
    } catch (err) {
      // Error is already handled in addStyle/removeStyle
      throw err;
    }
  }, [selectedStyleIds, addStyle, removeStyle]);

  // ===== UTILITY METHODS =====

  const canAddMoreStyles = userStyleStats ? userStyleStats.canAddMore : selectedStyleIds.length < USER_STYLE_CONSTANTS.MAX_STYLES_PER_USER;

  const getSelectedStyleNames = useCallback((): string[] => {
    if (!Array.isArray(selectedStyleIds) || !Array.isArray(allStyles)) {
      console.warn('⚠️ getSelectedStyleNames: Invalid data types', {
        selectedStyleIds: typeof selectedStyleIds,
        selectedStyleIdsIsArray: Array.isArray(selectedStyleIds),
        allStyles: typeof allStyles,
        allStylesIsArray: Array.isArray(allStyles)
      });
      return [];
    }

    // Get names from userStyles if available (has styleName)
    if (userStyles.length > 0) {
      return userStyles
        .filter(userStyle => selectedStyleIds.includes(userStyle.styleId))
        .map(userStyle => userStyle.styleName)
        .filter(Boolean);
    }

    // Fallback to allStyles (has name)
    return selectedStyleIds
      .map(id => {
        const style = allStyles.find(s => s?.styleId === id);
        return style?.name;
      })
      .filter(Boolean) as string[];
  }, [selectedStyleIds, allStyles, userStyles]);

  const getAvailableStyles = useCallback((): Style[] => {
    return allStyles.filter(style => !selectedStyleIds.includes(style.styleId));
  }, [allStyles, selectedStyleIds]);

  const validateStyleSelection = useCallback((styleIds: number[]) => {
    return userStyleService.validateStyleCount(styleIds);
  }, []);

  const refresh = useCallback(async (userId: number) => {
    setLoading(true);
    try {
      await Promise.all([
        loadUserStyles(userId),
        loadAllStyles()
      ]);
    } catch (err) {
      console.error('❌ Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, [loadUserStyles, loadAllStyles]);

  // ===== COMPUTED VALUES =====

  const isLoading = loading || loadingUserStyles || loadingAllStyles;

  return {
    // Data
    userStyles,
    allStyles,
    selectedStyleIds,
    stylesWithSelection,
    userStyleStats,
    
    // Loading states
    loading: isLoading,
    loadingUserStyles,
    loadingAllStyles,
    saving,
    
    // Error handling
    error,
    
    // Actions
    loadUserStyles,
    loadAllStyles,
    addStyle,
    removeStyle,
    updateStyles,
    syncStyles,
    toggleStyle,
    
    // Utilities
    canAddMoreStyles,
    getSelectedStyleNames,
    getAvailableStyles,
    validateStyleSelection,
    resetError,
    refresh,
  };
}

// Additional specialized hooks

export function useUserStylesOnly(userId: number | null) {
  const { userStyles, loadUserStyles, loadingUserStyles, error } = useUserStyle();
  
  useEffect(() => {
    if (userId) {
      loadUserStyles(userId);
    }
  }, [userId, loadUserStyles]);

  return {
    userStyles,
    loading: loadingUserStyles,
    error,
    refresh: () => userId ? loadUserStyles(userId) : Promise.resolve(),
  };
}

export function useStylesOnly() {
  const { allStyles, loadAllStyles, loadingAllStyles, error } = useUserStyle();
  
  useEffect(() => {
    loadAllStyles();
  }, [loadAllStyles]);

  return {
    styles: allStyles,
    loading: loadingAllStyles,
    error,
    refresh: loadAllStyles,
  };
}