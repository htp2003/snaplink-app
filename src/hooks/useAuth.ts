import React, { useState, useEffect, createContext, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";
export interface User {
  id: number;
  photographerId?: number;
  venueOwnerId?: number;
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
      AsyncStorage.setItem("currentUserId", authState.user.id.toString());
      
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
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      const response = await fetch(`${API_BASE_URL}/api/Auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        

        if (data.token) {
          await AsyncStorage.setItem("token", data.token);

         

          try {
            const userResponse = await fetch(
              `${API_BASE_URL}/api/User/GetUserByEmail?email=${encodeURIComponent(
                email
              )}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${data.token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (userResponse.ok) {
              const userData = await userResponse.json();
              

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
                roles: userRoles,
              };

              

              // ✅ CRITICAL: Save both user data and currentUserId consistently
              await AsyncStorage.setItem(
                "user",
                JSON.stringify(normalizedUser)
              );
              await AsyncStorage.setItem(
                "currentUserId",
                normalizedUser.id.toString()
              );

              setCurrentUserId(normalizedUser.id);
              

              setAuthState({
                user: normalizedUser,
                token: data.token,
                isLoading: false,
                isAuthenticated: true,
              });

              return normalizedUser;
            } else {
              throw new Error("Could not retrieve user data");
            }
          } catch (userFetchError) {
            console.error("❌ Error fetching user data:", userFetchError);
            throw userFetchError;
          }
        } else {
          throw new Error("No token in login response");
        }
      } else {
        const textResponse = await response.text();
        
        throw new Error(
          "Login successful but user data unavailable. Please contact support."
        );
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      

      // Get token before clearing it
      const token = await AsyncStorage.getItem("token");

      if (token) {
        try {
          

          // Call the logout API endpoint
          const response = await fetch(`${API_BASE_URL}/api/Auth/Logout`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          

          if (response.ok) {
            console.log("✅ Logout API call successful");
          } else {
            const errorText = await response.text();
            console.warn("⚠️ Logout API returned error:", errorText);
            // Continue with local cleanup even if API fails
          }
        } catch (apiError) {
          console.error("❌ Logout API error:", apiError);
          // Continue with local cleanup even if API fails
          
        }
      } else {
        console.log("ℹ️ No token found, skipping API call");
      }

      // Always clear local storage regardless of API success/failure
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("currentUserId");

      setCurrentUserId(null);

      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });

      
    } catch (error) {
      console.error("❌ Error during logout:", error);

      // Even if there's an error, still clear local state
      setCurrentUserId(null);
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });

      // Try to clear AsyncStorage anyway
      try {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("user");
        await AsyncStorage.removeItem("currentUserId");
      } catch (storageError) {
        console.error("❌ Error clearing storage:", storageError);
      }
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

      

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const textResponse = await response.text();
     

      // Step 2: Wait for database to process
      await new Promise((resolve) => setTimeout(resolve, 1000));

      

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
        

        const userId = realUser.id || realUser.userId;

        if (userId) {
          

          // ✅ CRITICAL: Set currentUserId immediately after registration
          setCurrentUserId(userId);
          await AsyncStorage.setItem("currentUserId", userId.toString());
          

          const normalizedUser = {
            ...realUser,
            id: userId,
            roles: realUser.roles?.$values || realUser.roles || [],
          };

          // ✅ Also save user data for consistency
          await AsyncStorage.setItem("user", JSON.stringify(normalizedUser));

          setAuthState((prev) => ({
            ...prev,
            isLoading: false,
            user: normalizedUser, // Set user in state
            isAuthenticated: true, // Mark as authenticated
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
      
  
      // ✅ VALIDATE: Prepare request body theo UpdateUserDto schema
      const requestBody = {
        userId: userId,                              // ✅ Required integer
        fullName: profileData.fullName || null,     // ✅ nullable string  
        phoneNumber: profileData.phoneNumber || null, // ✅ nullable string
        bio: profileData.bio || null,               // ✅ nullable string
        profileImage: profileData.profileImage || null // ✅ nullable string
      };
  
     
  
      const response = await fetch(`${API_BASE_URL}/api/User/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),  // ✅ Use validated requestBody
      });
  
      
  
      if (!response.ok) {
        // ✅ DETAILED ERROR LOGGING
        const errorText = await response.text();
        console.error('❌ API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          url: response.url
        });
  
        // Try to parse error as JSON if possible
        try {
          const errorJson = JSON.parse(errorText);
          console.error('❌ Parsed error JSON:', errorJson);
        } catch (e) {
          console.error('❌ Error is not JSON:', errorText);
        }
  
        throw new Error(`Update profile failed: ${response.status} - ${errorText}`);
      }
  
      // ✅ LOG SUCCESS RESPONSE
      const responseText = await response.text();
      
  
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        
      } catch (e) {
        
        responseData = null;
      }
  
      // Refresh user data
      const updatedUser = { ...authState.user, ...profileData };
      
      
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      setAuthState((prev) => ({ ...prev, user: updatedUser }));

      return responseData;
  
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ updateProfile error:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        profileData
      });
      throw error;
    }
  };

  const getCurrentUserId = () => {
    // ✅ Priority: authState.user.id > currentUserId > AsyncStorage
    const userId = authState.user?.id || currentUserId;
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

  const isUser = () => hasRole("User");
  const isPhotographer = () => hasRole("Photographer");
  const isLocationOwner = () => hasRole("Owner");
  const isAdmin = () => hasRole("Admin");
  const isModerator = () => hasRole("Moderator");

  return {
    roles: user?.roles || [],
    hasRole,
    isUser,
    isPhotographer,
    isLocationOwner,
    isAdmin,
    isModerator,
  };
}
