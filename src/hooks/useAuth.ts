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
  register: (userData: any) => Promise<any>; // Change to return any
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

  const checkAuthState = async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      const token = await AsyncStorage.getItem("token");
      const userJson = await AsyncStorage.getItem("user");

      if (token && userJson) {
        const user = JSON.parse(userJson);
        setCurrentUserId(null); // Clear userId nếu logout thất bại
        setAuthState({
          user,
          token,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error("Error checking auth state:", error);
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
    console.log('📥 Login response content-type:', response.headers.get('content-type'));
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }
    
    // Check content type
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      // Handle JSON response
      const data = await response.json();
      console.log('✅ Login success (JSON):', data);
      
      if (data.token) {
        // Save token first
        await AsyncStorage.setItem('token', data.token);
        
        // ✅ SỬ DỤNG getUserByEmail thay vì /api/User/{userId}
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

            // Lưu userId vào AsyncStorage nếu có
            if (userData.userId) {
              await AsyncStorage.setItem('currentUserId', userData.userId.toString());
              console.log('✅ Saved userId to AsyncStorage:', userData.userId);
            } else {
              console.warn('⚠️ userData.userId not found, cannot save to AsyncStorage');
            }
            
            // ✅ Parse roles correctly từ $values format
            let userRoles = [];
            if (userData.roles && userData.roles.$values) {
              userRoles = userData.roles.$values;
            } else if (userData.roles && Array.isArray(userData.roles)) {
              userRoles = userData.roles;
            }
            
            console.log('🔍 Parsed roles:', userRoles);
            
            // Normalize user data
            const normalizedUser = {
              ...userData,
              id: userData.userId || userData.id, // getUserByEmail trả về userId
              roles: userRoles // Sử dụng roles đã parse
            };
            
            console.log('✅ Normalized user:', normalizedUser);
            
            await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
            setCurrentUserId(normalizedUser.id);
            
            setAuthState({
              user: normalizedUser,
              token: data.token,
              isLoading: false,
              isAuthenticated: true,
            });
            
            // Check roles and navigate accordingly
            await handlePostLoginNavigation(normalizedUser);
            
            // ✅ RETURN USER DATA với roles đúng
            return normalizedUser;
            
          } else {
            const errorText = await userResponse.text();
            console.error('❌ getUserByEmail failed:', userResponse.status, errorText);
            throw new Error('Could not retrieve user data');
          }
        } catch (userFetchError) {
          console.error('❌ Error fetching user data with getUserByEmail:', userFetchError);
          throw userFetchError;
        }
        
      } else {
        throw new Error('No token in login response');
      }
    } else {
      // Handle text response
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

      setCurrentUserId(null); // Clear userId khi logout

      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error("Error during logout:", error);
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

      // Step 2: Wait a moment for database to process
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

        // Check both 'id' and 'userId' fields
        const userId = realUser.id || realUser.userId;

        if (userId) {
          console.log("✅ Using userId:", userId);
          setCurrentUserId(userId);

          // Ensure the user object has 'id' field for consistency
          const normalizedUser = {
            ...realUser,
            id: userId, // Normalize to 'id' field
            roles: realUser.roles?.$values || realUser.roles || [], // Handle $values array
          };

          setAuthState((prev) => ({ ...prev, isLoading: false }));
          return normalizedUser;
        } else {
          console.error("❌ No userId found in response");
        }
      } else {
        console.error("❌ GetUserByEmail failed:", userResponse.status);
        const errorText = await userResponse.text();
        console.error("❌ Error details:", errorText);
      }

      // Fallback: Could not get real user
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
      const token = await AsyncStorage.getItem("token");

      // Ensure userId is integer and reasonable
      const userIdInt = parseInt(userId.toString());
      if (isNaN(userIdInt)) {
        throw new Error("Invalid userId");
      }

      console.log("🔍 Assigning role:", roleType, "to userId:", userIdInt);

      const roleMap = {
        user: [2],
        photographer: [3],
        locationowner: [4],
      };

      // Try direct format first (based on swagger)
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
      console.log(
        "📥 Assign role response headers:",
        response.headers.get("content-type")
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Assign role API error:", errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      // Check response content type before parsing
      const contentType = response.headers.get("content-type");
      console.log("📥 Response content-type:", contentType);

      if (contentType && contentType.includes("text/plain")) {
        // Handle text response
        const textResponse = await response.text();
        console.log("✅ Assign role success (text):", textResponse);
        return { message: textResponse, success: true };
      } else {
        // Handle JSON response
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
    // Ưu tiên user.id nếu đã login, fallback to currentUserId
    return authState.user?.id || currentUserId;
  };

  const handlePostLoginNavigation = async (user: any) => {
    // This function will be called from LoginForm to handle navigation
    // We can't navigate directly from useAuth since it doesn't have access to navigation
    console.log("🔍 User roles after login:", user.roles);
    return user.roles;
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

// Test basic API call first
export async function testAssignRole(userId: number) {
  try {
    const token = await AsyncStorage.getItem("token");
    console.log("🔍 Testing with userId:", userId, "type:", typeof userId);

    // Test different request formats
    const formats = [
      // Format 1: Direct userId and roleIds
      { userId: userId, roleIds: [2] },

      // Format 2: Wrapped in request object
      { request: { userId: userId, roleIds: [2] } },

      // Format 3: String userId
      { userId: userId.toString(), roleIds: [2] },

      // Format 4: Just userId
      { userId: userId },
    ];

    for (let i = 0; i < formats.length; i++) {
      console.log(`🧪 Testing format ${i + 1}:`, JSON.stringify(formats[i]));

      const response = await fetch(`${API_BASE_URL}/api/User/assign-roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formats[i]),
      });

      console.log(`📥 Format ${i + 1} response:`, response.status);

      if (response.ok) {
        console.log(`✅ Format ${i + 1} works!`);
        return formats[i];
      } else {
        const errorText = await response.text();
        console.log(`❌ Format ${i + 1} failed:`, errorText.substring(0, 100));
      }
    }
  } catch (error) {
    console.error("Test error:", error);
  }
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
