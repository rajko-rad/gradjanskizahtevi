import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SignIn, SignUp, UserProfile, useAuth, useUser } from "@clerk/clerk-react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { syncUserWithSupabase } from "@/services/users";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { useEffect, useMemo, useState } from "react";

// Debug mode toggle
const DEBUG_MODE = true;

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
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Create a wrapper component that uses the hook
const SupabaseAuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Get Clerk auth state
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  
  // Call the hook once to sync Clerk auth with Supabase
  const auth = useSupabaseAuth();
  
  // Explicitly sync user data when Clerk auth state changes
  useEffect(() => {
    const syncUser = async () => {
      if (!isSignedIn || !user) {
        debugLog("No user signed in, skipping user sync");
        setInitialSyncDone(true);
        return;
      }
      
      try {
        debugLog("Explicitly syncing Clerk user to Supabase", {
          userId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
        });
        
        // Get primary email
        const primaryEmail = user.primaryEmailAddress?.emailAddress;
        if (!primaryEmail) {
          console.warn("No primary email found for user, can't sync");
          return;
        }
        
        // Get a fresh auth token directly from Clerk
        debugLog("Getting auth token for user sync");
        const token = await getToken({ template: 'supabase' });
        
        if (!token) {
          debugLog("Failed to get auth token for user sync, proceeding with anonymous client");
        } else {
          debugLog("Successfully obtained token for user sync");
        }
        
        // Manually sync user with Supabase, passing the token
        const syncedUser = await syncUserWithSupabase(
          user.id,
          primaryEmail,
          user.fullName,
          user.imageUrl,
          token // Pass the token to use an authenticated client
        );
        
        if (syncedUser) {
          debugLog("Successfully synced user with ID", syncedUser.id);
          
          // Invalidate any queries that might depend on the user
          queryClient.invalidateQueries({ queryKey: ['users', user.id] });
          queryClient.invalidateQueries({ queryKey: ['votes', 'user'] });
        } else {
          console.warn("User sync returned no data");
        }
        
        // Mark initial sync as done
        setInitialSyncDone(true);
      } catch (error) {
        console.error("Error syncing user to Supabase:", error);
      }
    };
    
    // Run sync when user changes
    syncUser();
  }, [isSignedIn, user, getToken]);
  
  // Use useMemo to prevent unnecessary re-renders of children
  return useMemo(() => <>{children}</>, [children]);
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
