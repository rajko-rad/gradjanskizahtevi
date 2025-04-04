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
  RefreshCcw
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
  const { supabaseUser, canVote, authToken, refreshAuth } = useSupabaseAuth();
  const [showComments, setShowComments] = useState(false);
  const [rangeValue, setRangeValue] = useState(min);

  // Fetch vote statistics
  const { 
    data: voteStats, 
    isLoading: isLoadingStats 
  } = useVoteStats(id);
  
  // Fetch user's existing vote
  const { 
    data: userVote, 
    isLoading: isLoadingUserVote,
    error: userVoteError 
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

  // Add a button to manually refresh auth if needed
  const handleRefreshAuth = () => {
    if (!canVote && isSignedIn) {
      toast({
        title: "Refreshing authentication",
        description: "Attempting to refresh your authentication...",
      });
      
      refreshAuth().then(() => {
        toast({
          title: "Authentication refreshed",
          description: "You can now vote on requests.",
        });
      }).catch(error => {
        toast({
          title: "Authentication failed",
          description: "Failed to refresh authentication. Please try again.",
          variant: "destructive",
        });
        console.error("Auth refresh error:", error);
      });
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
    
    if (!canVote) {
      toast({
        title: "Authentication issue",
        description: "There was a problem with your authentication. Trying to refresh...",
        variant: "destructive",
      });
      handleRefreshAuth();
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

  return (
    <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all overflow-hidden">
      <CardHeader className="pb-2 border-b bg-gray-50">
        <CardTitle className="text-lg font-bold text-serbia-blue">{title}</CardTitle>
        {description && <CardDescription className="mt-1">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-6">
        {renderVoteOptions()}
        
        {hasComments && (
          <div className="mt-6 pt-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full flex items-center justify-center text-gray-600 hover:text-serbia-blue hover:bg-serbia-blue/5"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Komentari
              {showComments ? 
                <ChevronUp className="h-4 w-4 ml-2" /> : 
                <ChevronDown className="h-4 w-4 ml-2" />
              }
            </Button>
            
            {showComments && (
              <div className="mt-4">
                {isLoadingComments ? (
                  <div className="p-4 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-serbia-blue" />
                  </div>
                ) : !canVote ? (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600">
                      Prijavite se da biste komentarisali
                    </p>
                  </div>
                ) : (
                  <CommentSystem requestId={id} comments={comments || []} />
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
