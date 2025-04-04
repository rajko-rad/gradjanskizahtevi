import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  Shield,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CommentSystem } from "./CommentSystem";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { 
  useVoteStats, 
  useCastVote, 
  useRemoveVote, 
  useUserVote, 
  useComments
} from "@/hooks/use-queries";
import { useUser } from "@clerk/clerk-react";

// Authentication status component
function AuthStatus({ 
  isSignedIn, 
  canVote, 
  tokenVerified, 
  isAuthRefreshing, 
  onRefresh 
}: { 
  isSignedIn: boolean; 
  canVote: boolean; 
  tokenVerified: boolean;
  isAuthRefreshing: boolean;
  onRefresh: () => void;
}) {
  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
        <ShieldAlert className="h-4 w-4 text-gray-400" />
        <span>Sign in to vote</span>
      </div>
    );
  }
  
  if (tokenVerified && canVote) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
        <ShieldCheck className="h-4 w-4" />
        <span>Auth verified</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2 text-sm text-amber-600 mt-2">
      <Shield className="h-4 w-4" />
      <span>Auth issue</span>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onRefresh} 
        disabled={isAuthRefreshing}
        className="h-6 px-2"
      >
        {isAuthRefreshing ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <RefreshCcw className="h-3 w-3 mr-1" />
        )}
        Refresh
      </Button>
    </div>
  );
}

interface VoteCardProps {
  id: string;
  title: string;
  description?: string;
  type: "yesno" | "multiple" | "range";
  options?: string[];
  min?: number;
  max?: number;
  hasComments?: boolean;
}

export function VoteCard({ 
  id,
  title, 
  description, 
  type, 
  options = [], 
  min = 3, 
  max = 18,
  hasComments = true,
}: VoteCardProps) {
  const { toast } = useToast();
  const { isSignedIn } = useAuth();
  const { supabaseUser, canVote, tokenVerified, refreshAuth } = useSupabaseAuth();
  const [showComments, setShowComments] = useState(false);
  const [rangeValue, setRangeValue] = useState(min);
  const [isAuthRefreshing, setIsAuthRefreshing] = useState(false);

  // Fetch vote statistics
  const { 
    data: voteStats, 
    isLoading: isLoadingStats 
  } = useVoteStats(id);
  
  // Fetch user's existing vote
  const { 
    data: userVote, 
    isLoading: isLoadingUserVote,
    error: userVoteError,
    refetch: refetchUserVote
  } = useUserVote(id);

  // If there's an error fetching the user vote, log it but don't break the UI
  useEffect(() => {
    if (userVoteError) {
      console.error("Error loading user vote:", userVoteError);
    }
  }, [userVoteError]);

  // Set up voting mutations
  const { mutate: castVote, isPending: isCastingVote } = useCastVote();
  const { mutate: removeVote, isPending: isRemovingVote } = useRemoveVote();

  // Fetch comments
  const { data: comments, isLoading: isLoadingComments } = useComments(
    id, 
    showComments
  );

  // Update selected option based on user's vote
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  useEffect(() => {
    if (userVote) {
      setSelectedOption(userVote.value);
    } else {
      setSelectedOption(null);
    }
  }, [userVote]);

  // Update refetch logic when authentication changes
  useEffect(() => {
    if (canVote && isSignedIn && !isLoadingUserVote) {
      refetchUserVote();
    }
  }, [canVote, isSignedIn, refetchUserVote, isLoadingUserVote]);

  // Add a button to manually refresh auth if needed
  const handleRefreshAuth = async () => {
    if (isAuthRefreshing) return;
    
    if (isSignedIn) {
      setIsAuthRefreshing(true);
      
      toast({
        title: "Refreshing authentication",
        description: "Attempting to refresh your authentication...",
      });
      
      try {
        await refreshAuth();
        
        // Give a short delay to allow auth to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (tokenVerified) {
          toast({
            title: "Authentication refreshed",
            description: "You can now vote on requests.",
          });
          
          // Refetch user's vote
          refetchUserVote();
        } else {
          toast({
            title: "Authentication failed",
            description: "Please try signing out and signing back in.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Auth refresh error:", error);
        toast({
          title: "Authentication failed",
          description: "Failed to refresh authentication. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsAuthRefreshing(false);
      }
    }
  };

  // Update error handling for voting
  const handleVote = async (value: string) => {
    if (!isSignedIn) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to vote.",
        variant: "destructive",
      });
      return;
    }
    
    if (!tokenVerified || !canVote) {
      toast({
        title: "Authentication issue",
        description: "There was a problem with your authentication. Trying to refresh...",
        variant: "destructive",
      });
      await handleRefreshAuth();
      
      // Check if auth refresh was successful
      if (!tokenVerified || !canVote) {
        return; // Still not authenticated
      }
    }

    // Validate that request ID exists
    if (!id) {
      toast({
        title: "Greška",
        description: "Neispravan ID zahteva.",
        variant: "destructive"
      });
      console.error("Attempted to vote with invalid request ID:", id);
      return;
    }

    // If already voted for this option, remove the vote
    if (selectedOption === value) {
      removeVote({ requestId: id }, {
        onSuccess: () => {
          toast({
            title: "Glas uklonjen",
            description: "Vaš glas je uspešno uklonjen.",
          });
        },
        onError: (error) => {
          console.error("Error removing vote:", error);
          toast({
            title: "Greška",
            description: error.message || "Došlo je do greške prilikom uklanjanja glasa.",
            variant: "destructive"
          });
        }
      });
    } else {
      // Cast or update vote
      castVote({ 
        requestId: id, 
        value: value,
        optionId: type === 'multiple' ? value : undefined
      }, {
        onSuccess: () => {
          toast({
            title: "Glas zabeležen",
            description: "Vaš glas je uspešno zabeležen.",
          });
        },
        onError: (error) => {
          console.error("Voting error:", error);
          toast({
            title: "Greška",
            description: error.message || "Došlo je do greške prilikom glasanja.",
            variant: "destructive"
          });
        }
      });
    }
  };

  // Handle range voting
  const handleRangeVote = () => {
    if (!isSignedIn) {
      toast({
        title: "Prijavite se",
        description: "Morate biti prijavljeni da biste mogli da glasate.",
        variant: "destructive"
      });
      return;
    }
    
    if (!canVote) {
      toast({
        title: "Greška sa autentikacijom",
        description: "Došlo je do greške sa vašom autentikacijom. Pokušajte da se odjavite i ponovo prijavite.",
        variant: "destructive"
      });
      return;
    }

    // Validate that request ID exists
    if (!id) {
      toast({
        title: "Greška",
        description: "Neispravan ID zahteva.",
        variant: "destructive"
      });
      console.error("Attempted to vote with invalid request ID:", id);
      return;
    }

    castVote({ 
      requestId: id, 
      value: rangeValue.toString() 
    }, {
      onSuccess: () => {
        toast({
          title: "Glas zabeležen",
          description: "Vaš glas je uspešno zabeležen.",
        });
      },
      onError: (error) => {
        console.error("Range voting error:", error);
        toast({
          title: "Greška",
          description: error.message || "Došlo je do greške prilikom glasanja.",
          variant: "destructive"
        });
      }
    });
  };

  const renderVoteOptions = () => {
    const isLoading = isLoadingStats || isLoadingUserVote || isCastingVote || isRemovingVote;

    if (isLoading) {
      return (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      );
    }

    switch (type) {
      case "yesno":
        const yesVotes = voteStats?.['yes'] || 0;
        const noVotes = voteStats?.['no'] || 0;
        const totalYesNoVotes = yesVotes + noVotes;
        
        return (
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Button
              onClick={() => handleVote("yes")}
              className={cn(
                "flex-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-all",
                selectedOption === "yes" && "bg-green-100 border-green-300"
              )}
              variant="outline"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ThumbsUp className="mr-2 h-4 w-4" />
              )}
              Da {totalYesNoVotes > 0 && `(${yesVotes})`}
              {selectedOption === "yes" && <CheckCircle2 className="ml-2 h-4 w-4 text-green-600" />}
            </Button>
            <Button
              onClick={() => handleVote("no")}
              className={cn(
                "flex-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-all",
                selectedOption === "no" && "bg-red-100 border-red-300"
              )}
              variant="outline"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ThumbsDown className="mr-2 h-4 w-4" />
              )}
              Ne {totalYesNoVotes > 0 && `(${noVotes})`}
              {selectedOption === "no" && <CheckCircle2 className="ml-2 h-4 w-4 text-red-600" />}
            </Button>
          </div>
        );
      case "multiple":
        return (
          <div className="flex flex-col gap-3 mt-6">
            {options.map((option, index) => {
              const voteCount = voteStats?.[option] || 0;
              return (
                <Button
                  key={index}
                  onClick={() => handleVote(option)}
                  className={cn(
                    "justify-between text-left bg-gray-50 hover:bg-gray-100 text-gray-800 border transition-all",
                    selectedOption === option && "bg-blue-50 text-blue-700 border-blue-200"
                  )}
                  variant="outline"
                  disabled={isLoading}
                >
                  <span>{option}</span>
                  <span className="flex items-center">
                    {voteCount > 0 && 
                      <span className="text-sm font-medium bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                        {voteCount}
                      </span>
                    }
                    {isLoading ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : selectedOption === option ? (
                      <CheckCircle2 className="ml-2 h-4 w-4 text-blue-600" />
                    ) : null}
                  </span>
                </Button>
              );
            })}
          </div>
        );
      case "range":
        return (
          <div className="mt-6">
            <div className="mb-3 flex justify-between text-xs text-gray-500">
              <span>{min} meseci</span>
              <span>{max} meseci</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={rangeValue}
              onChange={(e) => setRangeValue(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-serbia-blue"
              disabled={isLoading}
            />
            <div className="mt-3 text-center">
              <span className="text-sm font-medium bg-serbia-blue/10 text-serbia-blue px-3 py-1 rounded-full">
                {rangeValue} meseci
              </span>
            </div>
            <Button 
              onClick={handleRangeVote}
              className="w-full mt-6 bg-serbia-blue hover:bg-serbia-blue/90"
              variant="default"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Glasaj
            </Button>
          </div>
        );
    }
  };

  const commentCount = comments?.length || 0;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {isSignedIn && (
            <AuthStatus 
              isSignedIn={isSignedIn}
              canVote={canVote}
              tokenVerified={tokenVerified}
              isAuthRefreshing={isAuthRefreshing}
              onRefresh={handleRefreshAuth}
            />
          )}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {renderVoteOptions()}

        {/* Comments section */}
        {hasComments && (
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowComments(!showComments)}
              className="w-full flex items-center justify-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              {commentCount > 0 ? `Komentari (${commentCount})` : "Komentari"}
              {showComments ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            
            {showComments && (
              <div className="mt-4">
                {isLoadingComments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <CommentSystem 
                    requestId={id} 
                    comments={comments || []} 
                  />
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
