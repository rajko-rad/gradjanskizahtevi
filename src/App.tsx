import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SignIn, SignUp, UserProfile, useAuth, useUser } from "@clerk/clerk-react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { syncUserWithSupabase } from "@/services/users";
import { getSupabaseClient, logTokenInfo } from "@/lib/clerk-supabase"; 
import clerkSupabase from "@/lib/clerk-supabase";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
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
};

const AuthContext = createContext<AuthContextType>({
  token: null,
  refreshToken: async () => null,
  isAuthenticated: false,
});

export const useAuthContext = () => useContext(AuthContext);

// Create a wrapper component that uses the hook
const SupabaseAuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Get Clerk auth state - separate useAuth and useUser calls
  const { isSignedIn, getToken } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  
  // State for tracking initialization and sync
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  
  // Refs for tracking sync state
  const syncInProgress = useRef(false);
  const retryAttempts = useRef(0);
  const isMounted = useRef(true);
  const cachedTokenRef = useRef<string | null>(null);
  const tokenRefreshTimerRef = useRef<number | null>(null);
  
  // Call the hook once to sync Clerk auth with Supabase
  const auth = useSupabaseAuth();
  
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
      const token = await clerkSupabase.refreshToken(
        () => getToken({ template: 'supabase' }),
        cachedTokenRef.current
      );
      
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
  
  // Function to sync user with exponential backoff
  const syncUserWithBackoff = useCallback(async () => {
    if (syncInProgress.current || !isMounted.current) {
      return null;
    }
    
    syncInProgress.current = true;
    
    try {
      // If user is not signed in, don't attempt to sync
      if (!isSignedIn || !user) {
        debugLog("No user signed in, skipping sync");
        return null;
      }
      
      // Get primary email
      const primaryEmail = user.primaryEmailAddress?.emailAddress;
      if (!primaryEmail) {
        debugLog("No primary email found, cannot sync user");
        return null;
      }
      
      // Get token with retry logic
      let token = cachedTokenRef.current;
      
      // Check if token is valid or needs refresh
      if (!token || clerkSupabase.isTokenExpired(token)) {
        // Try to get a fresh token with exponential backoff
        for (let attempt = 0; attempt < MAX_SYNC_RETRIES; attempt++) {
          token = await getAndCacheToken(true); // Force refresh
          
          if (token) break;
          
          // If this isn't our last attempt, wait before retrying
          if (attempt < MAX_SYNC_RETRIES - 1) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
            debugLog(`Token retrieval failed, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_SYNC_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      if (!token) {
        debugLog("Failed to get token after retries, cannot sync user");
        return null;
      }
      
      // Sync the user with Supabase using the token
      debugLog("Syncing user with Supabase", { userId: user.id, email: primaryEmail });
      const syncedUser = await syncUserWithSupabase(
        user.id,
        primaryEmail,
        user.fullName,
        user.imageUrl,
        token
      );
      
      if (syncedUser) {
        debugLog("User successfully synced with ID", syncedUser.id);
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['users', user.id] });
        queryClient.invalidateQueries({ queryKey: ['votes', 'user'] });
        
        return syncedUser;
      } else {
        debugLog("User sync returned no data");
        return null;
      }
    } catch (error) {
      console.error("Error syncing user:", error);
      return null;
    } finally {
      syncInProgress.current = false;
    }
  }, [isSignedIn, user, getAndCacheToken]);
  
  // Explicitly sync user data when Clerk auth state changes
  useEffect(() => {
    isMounted.current = true;
    
    const handleAuthChange = async () => {
      debugLog("Auth state change detected", { isSignedIn, isUserLoaded });
      
      // Only start initialization if both Clerk states are loaded
      if (!isUserLoaded) {
        debugLog("Clerk user not fully loaded yet, waiting");
        return;
      }
      
      // Set initializing state
      setIsInitializing(true);
      
      if (!isSignedIn) {
        debugLog("User not signed in, clearing auth state");
        cachedTokenRef.current = null;
        setCurrentToken(null);
        setInitialSyncDone(true);
        setIsInitializing(false);
        return;
      }
      
      // User is signed in, sync with Supabase
      try {
        const syncedUser = await syncUserWithBackoff();
        
        // Set up token refresh timer after initial sync
        setupTokenRefreshTimer();
        
        if (isMounted.current) {
          setInitialSyncDone(true);
          setIsInitializing(false);
        }
      } catch (error) {
        console.error("Error in initial auth sync:", error);
        if (isMounted.current) {
          setInitialSyncDone(true);
          setIsInitializing(false);
        }
      }
    };
    
    handleAuthChange();
    
    return () => {
      isMounted.current = false;
      if (tokenRefreshTimerRef.current) {
        clearInterval(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }
    };
  }, [isSignedIn, isUserLoaded, syncUserWithBackoff, setupTokenRefreshTimer]);
  
  // Export the token through context with a provider component - this must be created at every render
  const providerValue = useMemo(() => ({
    token: currentToken,
    refreshToken: () => getAndCacheToken(true),
    isAuthenticated: !!isSignedIn && !!currentToken
  }), [currentToken, getAndCacheToken, isSignedIn]);
  
  // Show loading indicator while initializing
  if (isInitializing) {
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
    <SupabaseAuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
            <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />
            <Route path="/user-profile/*" element={<UserProfile routing="path" path="/user-profile" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </SupabaseAuthProvider>
  </QueryClientProvider>
);

export default App;
