import { useAuth, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

export const useAuthentication = () => {
  const { userId, isLoaded, isSignedIn } = useAuth();
  
  return {
    userId,
    isLoaded,
    isSignedIn,
  };
}; 