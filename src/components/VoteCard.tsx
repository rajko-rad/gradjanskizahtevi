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
  isAuthRefreshing, 
  onRefresh 
}: { 
  isSignedIn: boolean; 
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
  
  return (
    <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
      <ShieldCheck className="h-4 w-4" />
      <span>Auth verified</span>
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

// Option interface from Supabase
interface Option {
  id: string;
  request_id: string;
  text: string;
  created_at: string;
}

interface VoteCardProps {
  id: string;
  title: string;
  description?: string;
  type: "yesno" | "multiple" | "range";
  options?: Option[] | string[];
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
  const { supabaseUser, refreshAuth, isLoading: isAuthLoading } = useSupabaseAuth();
  const [showComments, setShowComments] = useState(false);
  const [rangeValue, setRangeValue] = useState(min);
  const [isAuthRefreshing, setIsAuthRefreshing] = useState(false);

  // Process options to normalize between string[] and Option[]
  const processedOptions = options.map(option => {
    if (typeof option === 'string') {
      return option;
    } else if (option && typeof option === 'object' && 'text' in option) {
      return option.text;
    }
    return '';
  }).filter(Boolean);

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
    if (isSignedIn && !isLoadingUserVote) {
      refetchUserVote();
    }
  }, [isSignedIn, refetchUserVote, isLoadingUserVote]);

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
        
        // Refetch user's vote
        refetchUserVote();
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
        value: value
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

  // Render a vote summary section with breakdown
  const renderVoteSummary = () => {
    // If stats are loading or there are no votes, don't show summary
    if (isLoadingStats || !voteStats) {
      return null;
    }

    // For yes/no votes
    if (type === "yesno") {
      const yesVotes = voteStats?.['yes'] || 0;
      const noVotes = voteStats?.['no'] || 0;
      const totalVotes = yesVotes + noVotes;
      
      // Don't show if no votes yet
      if (totalVotes === 0) return null;
      
      // Calculate percentages
      const yesPercentage = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;
      const noPercentage = totalVotes > 0 ? Math.round((noVotes / totalVotes) * 100) : 0;
      
      return (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2 flex justify-between">
            <span>Ukupno glasova: {totalVotes}</span>
          </div>
          
          {/* Yes bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-green-700">Za: {yesVotes}</span>
              <span className="font-medium text-green-700">{yesPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-green-500 h-2.5 rounded-full" 
                style={{ width: `${yesPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* No bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-red-700">Protiv: {noVotes}</span>
              <span className="font-medium text-red-700">{noPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-red-500 h-2.5 rounded-full" 
                style={{ width: `${noPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      );
    }
    
    // For multiple choice votes
    if (type === "multiple" && processedOptions.length > 0) {
      const voteValues = Object.values(voteStats.breakdown || {});
      const totalVotes = voteValues.reduce((sum, count) => sum + count, 0);
      
      // If no votes, don't show
      if (totalVotes === 0) return null;
      
      return (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-3">
            Ukupno glasova: {totalVotes}
          </div>
          
          {processedOptions.map((option, index) => {
            const voteCount = voteStats?.breakdown?.[option] || 0;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            
            return (
              <div key={index} className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700">{option.length > 30 ? `${option.substring(0, 30)}...` : option}</span>
                  <div>
                    <span className="font-medium text-gray-700">{voteCount} </span>
                    <span className="font-medium text-gray-500">({percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-500 h-2.5 rounded-full" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    
    // For range voting, show distribution
    if (type === "range") {
      // Calculate total votes by summing all values in the breakdown
      const breakdown = voteStats?.breakdown || {};
      const totalVotes = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
      
      if (totalVotes === 0) return null;
      
      // Find most popular choice
      let mostPopularValue = min;
      let maxCount = 0;
      
      for (let i = min; i <= max; i++) {
        const count = breakdown[i.toString()] || 0;
        if (count > maxCount) {
          maxCount = count;
          mostPopularValue = i;
        }
      }
      
      return (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Ukupno glasova: {totalVotes}
          </div>
          <div className="flex flex-col items-center">
            <div className="w-full text-center mb-1">
              <span className="text-sm font-medium text-serbia-blue">
                Najčešći izbor: {mostPopularValue} meseci ({maxCount} glasova)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 flex items-center">
              {/* Position marker for most popular choice */}
              <div
                className="absolute w-2 h-5 bg-serbia-blue rounded"
                style={{ 
                  left: `calc(${((mostPopularValue - min) / (max - min)) * 100}% + 16px)`,
                  marginLeft: "-1px"
                }}
              ></div>
            </div>
            <div className="w-full flex justify-between text-xs mt-1">
              <span>{min} meseci</span>
              <span>{max} meseci</span>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  const renderVoteOptions = () => {
    const isLoading = isLoadingStats || isLoadingUserVote || isCastingVote || isRemovingVote;
    const isDisabled = isLoading || isAuthLoading || !isSignedIn;

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
                "flex-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-all py-6 text-base",
                selectedOption === "yes" && "bg-green-100 border-green-300"
              )}
              variant="outline"
              disabled={isDisabled}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ThumbsUp className="mr-2 h-5 w-5" />
              )}
              <span className="font-medium">Za</span>
              {selectedOption === "yes" && <CheckCircle2 className="ml-2 h-5 w-5 text-green-600" />}
            </Button>
            <Button
              onClick={() => handleVote("no")}
              className={cn(
                "flex-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-all py-6 text-base",
                selectedOption === "no" && "bg-red-100 border-red-300"
              )}
              variant="outline"
              disabled={isDisabled}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ThumbsDown className="mr-2 h-5 w-5" />
              )}
              <span className="font-medium">Protiv</span>
              {selectedOption === "no" && <CheckCircle2 className="ml-2 h-5 w-5 text-red-600" />}
            </Button>
          </div>
        );
      case "multiple":
        return (
          <div className="flex flex-col gap-3 mt-6">
            {processedOptions.map((option, index) => {
              const voteCount = voteStats?.breakdown?.[option] || 0;
              return (
                <Button
                  key={index}
                  onClick={() => handleVote(option)}
                  className={cn(
                    "justify-between text-left bg-gray-50 hover:bg-gray-100 text-gray-800 border transition-all py-5 px-4 h-auto",
                    selectedOption === option && "bg-blue-50 text-blue-700 border-blue-200"
                  )}
                  variant="outline"
                  disabled={isDisabled}
                >
                  <span className="font-medium">{option}</span>
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
              disabled={isDisabled}
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
              disabled={isDisabled}
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
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {renderVoteSummary()}
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
