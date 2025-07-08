import React, { useState, useEffect, createContext, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";
export interface User {
  id: number;
  photographerId?: number; 
  email: string;
  fullName: string;
  phoneNumber?: string;
  profileImage?: string;
  bio?: string;
  roles: string[];
  gender?: string;
  ageRange?: string;
  interests?: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  register: (userData: any) => Promise<any>;
  logout: () => Promise<void>;
  updateProfile: (userId: number, profileData: any) => Promise<void>;
  assignRole: (
    userId: number,
    roleType: "user" | "photographer" | "locationowner"
  ) => Promise<any>;
  checkAuthState: () => Promise<void>;
  currentUserId: number | null;
  getCurrentUserId: () => number | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider(props: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  // Sync currentUserId with authState.user.id whenever user changes
  useEffect(() => {
    if (authState.user?.id) {
      setCurrentUserId(authState.user.id);
      // Also save to AsyncStorage for persistence
      AsyncStorage.setItem('currentUserId', authState.user.id.toString());
      console.log('🔄 Synced currentUserId with user.id:', authState.user.id);
    }
  }, [authState.user]);

  const checkAuthState = async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      const token = await AsyncStorage.getItem("token");
      const userJson = await AsyncStorage.getItem("user");

      if (token && userJson) {
        const user = JSON.parse(userJson);
        setCurrentUserId(user.id); // Set currentUserId from stored user
        setAuthState({
          user,
          token,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setCurrentUserId(null);
        setAuthState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error("Error checking auth state:", error);
      setCurrentUserId(null);
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await fetch(`${API_BASE_URL}/api/Auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      console.log('📥 Login response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('✅ Login success (JSON):', data);
        
        if (data.token) {
          await AsyncStorage.setItem('token', data.token);
          
          console.log('🔍 Getting user data using getUserByEmail API...');
          
          try {
            const userResponse = await fetch(`${API_BASE_URL}/api/User/GetUserByEmail?email=${encodeURIComponent(email)}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${data.token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (userResponse.ok) {
              const userData = await userResponse.json();
              console.log('✅ Retrieved user data from getUserByEmail:', userData);

              // Parse roles correctly
              let userRoles = [];
              if (userData.roles && userData.roles.$values) {
                userRoles = userData.roles.$values;
              } else if (userData.roles && Array.isArray(userData.roles)) {
                userRoles = userData.roles;
              }
              
              const normalizedUser = {
                ...userData,
                id: userData.userId || userData.id,
                roles: userRoles
              };
              
              console.log('✅ Normalized user:', normalizedUser);
              
              // ✅ CRITICAL: Save both user data and currentUserId consistently
              await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
              await AsyncStorage.setItem('currentUserId', normalizedUser.id.toString());
              
              setCurrentUserId(normalizedUser.id);
              console.log('💾 Saved userId to state and AsyncStorage:', normalizedUser.id);
              
              setAuthState({
                user: normalizedUser,
                token: data.token,
                isLoading: false,
                isAuthenticated: true,
              });
              
              return normalizedUser;
              
            } else {
              throw new Error('Could not retrieve user data');
            }
          } catch (userFetchError) {
            console.error('❌ Error fetching user data:', userFetchError);
            throw userFetchError;
          }
        } else {
          throw new Error('No token in login response');
        }
      } else {
        const textResponse = await response.text();
        console.log('✅ Login success (text):', textResponse);
        throw new Error('Login successful but user data unavailable. Please contact support.');
      }
      
    } catch (error) {
      console.error('❌ Login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("currentUserId"); // Also clear currentUserId

      setCurrentUserId(null);

      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error("Error during logout:", error);
      setCurrentUserId(null);
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const register = async (userData: any) => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      // Step 1: Register user
      const response = await fetch(`${API_BASE_URL}/api/User/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      console.log("📥 Register response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const textResponse = await response.text();
      console.log("✅ Registration successful:", textResponse);

      // Step 2: Wait for database to process
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 3: Get real user data using GetUserByEmail API
      console.log("🔍 Getting real user data by email:", userData.email);

      const userResponse = await fetch(
        `${API_BASE_URL}/api/User/GetUserByEmail?email=${encodeURIComponent(
          userData.email
        )}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (userResponse.ok) {
        const realUser = await userResponse.json();
        console.log("✅ Found real user:", realUser);

        const userId = realUser.id || realUser.userId;

        if (userId) {
          console.log("✅ Using userId:", userId);
          
          // ✅ CRITICAL: Set currentUserId immediately after registration
          setCurrentUserId(userId);
          await AsyncStorage.setItem('currentUserId', userId.toString());
          console.log('💾 Saved registered userId to state and AsyncStorage:', userId);

          const normalizedUser = {
            ...realUser,
            id: userId,
            roles: realUser.roles?.$values || realUser.roles || [],
          };

          // ✅ Also save user data for consistency
          await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));

          setAuthState((prev) => ({ 
            ...prev, 
            isLoading: false,
            user: normalizedUser, // Set user in state
            isAuthenticated: true // Mark as authenticated
          }));
          
          return normalizedUser;
        } else {
          console.error("❌ No userId found in response");
        }
      } else {
        console.error("❌ GetUserByEmail failed:", userResponse.status);
      }

      throw new Error(
        "Registration completed but could not retrieve user data. Please try logging in."
      );
    } catch (error) {
      console.error("❌ Register error:", error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const updateProfile = async (userId: number, profileData: any) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(`${API_BASE_URL}/api/User/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          ...profileData,
        }),
      });

      if (!response.ok) {
        throw new Error("Update profile failed");
      }

      // Refresh user data
      const updatedUser = { ...authState.user, ...profileData };
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      setAuthState((prev) => ({ ...prev, user: updatedUser }));
    } catch (error) {
      throw error;
    }
  };

  const assignRole = async (
    userId: number,
    roleType: "user" | "photographer" | "locationowner"
  ) => {
    try {
      // ✅ ALWAYS use the provided userId parameter, not getCurrentUserId()
      const userIdInt = parseInt(userId.toString());
      if (isNaN(userIdInt)) {
        throw new Error("Invalid userId");
      }

      console.log("🔍 Assigning role:", roleType, "to userId:", userIdInt);
      console.log("🔍 Current authState.user.id:", authState.user?.id);
      console.log("🔍 Current currentUserId:", currentUserId);

      const token = await AsyncStorage.getItem("token");

      const roleMap = {
        user: [2],
        photographer: [3],
        locationowner: [4],
      };

      const requestBody = {
        userId: userIdInt,
        roleIds: roleMap[roleType],
      };

      console.log("📤 Assign role request:", JSON.stringify(requestBody));

      const response = await fetch(`${API_BASE_URL}/api/User/assign-roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 Assign role response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Assign role API error:", errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      console.log("📥 Response content-type:", contentType);

      if (contentType && contentType.includes("text/plain")) {
        const textResponse = await response.text();
        console.log("✅ Assign role success (text):", textResponse);
        return { message: textResponse, success: true };
      } else {
        const data = await response.json();
        console.log("✅ Assign role success (JSON):", data);
        return data;
      }
    } catch (error) {
      console.error("❌ Assign role error:", error);
      throw error;
    }
  };

  const getCurrentUserId = () => {
    // ✅ Priority: authState.user.id > currentUserId > AsyncStorage
    const userId = authState.user?.id || currentUserId;
    console.log('🔍 getCurrentUserId called:', {
      'authState.user.id': authState.user?.id,
      'currentUserId': currentUserId,
      'returned': userId
    });
    return userId;
  };

  const contextValue: AuthContextType = {
    user: authState.user,
    token: authState.token,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    assignRole,
    checkAuthState,
    currentUserId,
    getCurrentUserId,
  };

  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    props.children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export function useAuthUser() {
  const { user } = useAuth();
  return user;
}

export function useIsAuthenticated() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

export function useCurrentUserId() {
  const { getCurrentUserId } = useAuth();
  return getCurrentUserId();
}

export function useUserRole() {
  const { user } = useAuth();

  const hasRole = (role: string) => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  };

  const isUser = () => hasRole("user");
  const isPhotographer = () => hasRole("photographer");
  const isLocationOwner = () => hasRole("locationowner");
  const isAdmin = () => hasRole("admin");

  return {
    roles: user?.roles || [],
    hasRole,
    isUser,
    isPhotographer,
    isLocationOwner,
    isAdmin,
  };
}