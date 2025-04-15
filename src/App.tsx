import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SignIn, SignUp, UserProfile, useAuth, useUser } from "@clerk/clerk-react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { syncUserWithSupabase, type User } from "@/services/users";
import { getSupabaseClient, logTokenInfo } from "@/lib/clerk-supabase"; 
import clerkSupabase from "@/lib/clerk-supabase";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import { useEffect, useMemo, useState, useRef, useCallback, createContext, useContext } from "react";

// Debug mode toggle
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Debug logger function
function debugLog(message: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(`APP: ${message}`, ...args);
  }
}

// Create a more persistent QueryClient to avoid recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time (30 seconds)
      staleTime: 30 * 1000,
      
      // Wait and batch requests made in the same tick - reduces parallel requests
      gcTime: 10 * 60 * 1000, // Keep cache for 10 minutes
      
      // Avoid refetching on window focus by default, let components control this
      refetchOnWindowFocus: false,
      
      // Batch queries in the same tick (important for parallel vote queries!)
      networkMode: 'offlineFirst',
    },
  },
});

// Constants for auth handling
const MAX_SYNC_RETRIES = 3;
const INITIAL_RETRY_DELAY = 500;
const TOKEN_REFRESH_INTERVAL = 60 * 1000; // 1 minute

// Create a context for auth state
type AuthContextType = {
  token: string | null;
  refreshToken: () => Promise<string | null>;
  isAuthenticated: boolean;
  supabaseUser: User | null;
  isLoadingAuth: boolean;
};

const AuthContext = createContext<AuthContextType>({
  token: null,
  refreshToken: async () => null,
  isAuthenticated: false,
  supabaseUser: null,
  isLoadingAuth: true,
});

export const useAuthContext = () => useContext(AuthContext);

// Create a wrapper component that uses the hook
const SupabaseAuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Get Clerk auth state
  const { isSignedIn, getToken } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  
  // State for tracking initialization, sync, token, and Supabase user profile
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  
  // Refs for tracking sync state
  const syncInProgress = useRef(false);
  const isMounted = useRef(true);
  const cachedTokenRef = useRef<string | null>(null);
  const tokenRefreshTimerRef = useRef<number | null>(null);
  
  // Function to get and cache a token
  const getAndCacheToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    // If we have a valid cached token and aren't forcing a refresh, use it
    if (!forceRefresh && cachedTokenRef.current && !clerkSupabase.isTokenExpired(cachedTokenRef.current)) {
      debugLog("Using cached token");
      return cachedTokenRef.current;
    }
    
    try {
      debugLog("Getting fresh token from Clerk");
      
      // Use our improved refreshToken utility
      const token = await getToken({ template: 'supabase' });
      
      if (!token) {
        debugLog("No token returned from Clerk");
        return null;
      }
      
      debugLog("Token obtained, length: " + token.length);
      logTokenInfo(token);
      
      // Cache the token
      cachedTokenRef.current = token;
      setCurrentToken(token);
      
      return token;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }, [getToken]);
  
  // Schedule regular token refreshes to avoid expiration problems
  const setupTokenRefreshTimer = useCallback(() => {
    // Clear any existing timer
    if (tokenRefreshTimerRef.current) {
      clearInterval(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
    
    // Only set up refresh timer if signed in
    if (isSignedIn) {
      debugLog("Setting up token refresh timer");
      tokenRefreshTimerRef.current = window.setInterval(() => {
        const currentToken = cachedTokenRef.current;
        
        // Check if token is expired or will expire soon
        if (currentToken && clerkSupabase.isTokenExpired(currentToken)) {
          debugLog("Token expiring soon, refreshing");
          getAndCacheToken(true).catch(error => {
            console.error("Error in scheduled token refresh:", error);
          });
        }
      }, TOKEN_REFRESH_INTERVAL);
    }
  }, [isSignedIn, getAndCacheToken]);
  
  // Function to sync user AND fetch profile
  const syncAndFetchProfile = useCallback(async () => {
    if (syncInProgress.current || !isMounted.current || !isSignedIn || !user) {
      return null;
    }
    
    syncInProgress.current = true;
    setIsLoadingAuth(true); // Start loading for the whole auth process
    let fetchedToken: string | null = null;
    let syncedSupabaseUser: User | null = null;

    try {
      // Step 1: Get Token (with retries inside getAndCacheToken if needed)
      fetchedToken = await getAndCacheToken(true); // Force refresh during sync
      if (!fetchedToken) {
        throw new Error("Failed to get auth token after retries.");
      }
      
      // Step 2: Sync User with Supabase (create/update row in public.users)
      const primaryEmail = user.primaryEmailAddress?.emailAddress;
      if (!primaryEmail) throw new Error("Primary email not found.");

      debugLog("Syncing user with Supabase", { userId: user.id });
      const syncResult = await syncUserWithSupabase(
        user.id,
        primaryEmail,
        user.fullName,
        user.imageUrl,
        fetchedToken
      );
      // syncUserWithSupabase likely returns the user object or null/throws error
      // We don't strictly need its return value if we fetch separately, but logging is good
      debugLog("Sync result:", syncResult ? "Success" : "No user data returned from sync"); 

      // Step 3: Fetch the definitive Supabase User Profile
      debugLog("Fetching definitive Supabase user profile for:", user.id);
      const client = getSupabaseClient(fetchedToken);
      const { data: profileData, error: profileError } = await client
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      syncedSupabaseUser = profileData;
      debugLog("Successfully fetched Supabase user profile", syncedSupabaseUser);

    } catch (error) {
      console.error("Error during sync and fetch profile:", error);
      // Keep existing token if fetch failed? Maybe clear it?
      // setSupabaseUser(null); // Clear profile on error
    } finally {
      // Update state regardless of success/failure after attempt
      if (isMounted.current) {
        setCurrentToken(fetchedToken); // Update token state
        setSupabaseUser(syncedSupabaseUser); // Update profile state
        setIsLoadingAuth(false); // End loading for the auth process
      }
      syncInProgress.current = false;
    }
    return syncedSupabaseUser; // Return fetched profile
  }, [isSignedIn, user, getAndCacheToken]);
  
  // Effect to handle auth changes
  useEffect(() => {
    isMounted.current = true;
    debugLog("Auth state change detected", { isSignedIn, isUserLoaded });

    if (!isUserLoaded) {
      debugLog("Clerk user not fully loaded yet, waiting");
      setIsLoadingAuth(true); // Remain in loading state
      return;
    }

    if (!isSignedIn) {
      debugLog("User signed out, clearing auth state");
      cachedTokenRef.current = null;
      setCurrentToken(null);
      setSupabaseUser(null);
      setIsLoadingAuth(false); // No longer loading
      if (tokenRefreshTimerRef.current) clearInterval(tokenRefreshTimerRef.current);
    } else {
      // User is signed in (or state just changed to signed in)
      debugLog("User signed in, starting sync and profile fetch");
      syncAndFetchProfile();
      setupTokenRefreshTimer();
    }

    // Cleanup function
    return () => {
      isMounted.current = false;
      if (tokenRefreshTimerRef.current) {
        clearInterval(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }
    };
  // Rerun when Clerk state changes
  }, [isSignedIn, isUserLoaded, syncAndFetchProfile, setupTokenRefreshTimer]); 
  
  // Provide state through context
  const providerValue = useMemo(() => ({
    token: currentToken,
    refreshToken: () => getAndCacheToken(true),
    isAuthenticated: !!isSignedIn && !!currentToken,
    supabaseUser: supabaseUser, // Provide the fetched Supabase user
    isLoadingAuth: isLoadingAuth, // Provide the combined loading state
  }), [currentToken, getAndCacheToken, isSignedIn, supabaseUser, isLoadingAuth]);
  
  // Show loading indicator only during initial auth check
  if (isLoadingAuth && !supabaseUser && !currentToken) { // More specific loading condition
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-serbia-blue border-t-transparent rounded-full"></div>
        <span className="ml-2 text-serbia-blue font-medium">Inicijalizacija...</span>
      </div>
    );
  }
  
  // Return the context provider with children
  return (
    <AuthContext.Provider value={providerValue}>
      {children}
    </AuthContext.Provider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <SupabaseAuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
            <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />
            <Route path="/user-profile/*" element={<UserProfile routing="path" path="/user-profile" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <Sonner />
        </SupabaseAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
