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
  useComments
} from "@/hooks/use-queries";
import { useUser } from "@clerk/clerk-react";
import * as votesService from '@/services/votes'; // Import Vote type source

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
  userVoteData: votesService.Vote | null; // Add prop for passed-in user vote
  isLoadingUserVote: boolean; // Add prop for bulk loading state
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
  userVoteData, // Destructure new prop
  isLoadingUserVote // Destructure new prop
}: VoteCardProps) {
  const { toast } = useToast();
  const { isSignedIn } = useAuth();
  const { supabaseUser, isLoading: isAuthLoading } = useSupabaseAuth();
  const [showComments, setShowComments] = useState(false);
  const [rangeValue, setRangeValue] = useState(min);

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
  
  // Debug vote stats when they change
  useEffect(() => {
    console.log(`[Debug VoteCard ${id}] Vote stats data:`, {
      voteStats,
      hasBreakdown: voteStats?.breakdown ? Object.keys(voteStats.breakdown).length : 0,
      breakdown: voteStats?.breakdown,
      isLoading: isLoadingStats
    });
  }, [voteStats, isLoadingStats, id]);

  // Set up voting mutations
  const { mutate: castVote, isPending: isCastingVote } = useCastVote();
  const { mutate: removeVote, isPending: isRemovingVote } = useRemoveVote();

  // Fetch comments
  const { data: comments, isLoading: isLoadingComments } = useComments(
    id, 
    showComments
  );

  // Update selected option based on user's vote (using prop)
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  useEffect(() => {
    if (userVoteData) {
      setSelectedOption(userVoteData.value);
    } else {
      setSelectedOption(null);
    }
  }, [userVoteData]); // Depend on the prop

  // Log timing for vote stats fetching
  useEffect(() => {
    if (isLoadingStats) {
      console.time(`[VoteCard ${id}] Fetch Vote Stats`);
    } else {
      // Use a timeout to ensure this logs after potential state updates
      setTimeout(() => console.timeEnd(`[VoteCard ${id}] Fetch Vote Stats`), 0);
    }
  }, [isLoadingStats, id]);

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
      const yesVotes = voteStats?.breakdown?.['yes'] || 0;
      const noVotes = voteStats?.breakdown?.['no'] || 0;
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
      // Calculate total votes for range
      const rangeVotes = Object.values(voteStats?.breakdown || {}).reduce((sum, count) => sum + count, 0);
      
      // Build distribution data for range votes with proper typing
      const rangeDistribution: Record<string, number> = {};
      
      // Populate the distribution
      for (let i = min; i <= max; i++) {
        rangeDistribution[i.toString()] = voteStats?.breakdown?.[i.toString()] || 0;
      }
      
      // Find popular choices with proper typing
      const sortedChoices = Object.entries(rangeDistribution)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 3)
        .filter(([, count]) => count > 0);
      
      // Debug range votes
      console.log(`[Debug Range ${id}] Range votes:`, {
        totalVotes: rangeVotes,
        distribution: rangeDistribution,
        popularChoices: sortedChoices,
        breakdown: voteStats?.breakdown
      });
      
      return (
        <div className="mt-4">
          {rangeVotes > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200">
              <p className="text-sm text-center text-gray-600 mb-2">Ukupno glasova: <span className="font-semibold">{rangeVotes}</span></p>
              
              {sortedChoices.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  {sortedChoices.map(([value, count]) => (
                    <div 
                      key={value} 
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                        value === sortedChoices[0][0] ? "bg-serbia-blue/20 text-serbia-blue" : "bg-gray-200 text-gray-700"
                      )}
                    >
                      {value} meseci
                      <span className={cn(
                        "inline-flex items-center justify-center rounded-full px-1.5 text-xs font-bold",
                        value === sortedChoices[0][0] ? "bg-serbia-blue text-white" : "bg-gray-500 text-white"
                      )}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        
          <div className="mb-2 flex justify-between text-xs text-gray-500">
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
            disabled={isAuthLoading || !isSignedIn}
          />
          <div className="mt-3 text-center">
            <span className="text-sm font-medium bg-serbia-blue/10 text-serbia-blue px-3 py-1 rounded-full">
              {rangeValue} meseci
            </span>
          </div>
          <Button 
            onClick={handleRangeVote}
            className="w-full mt-6 bg-serbia-blue hover:bg-serbia-blue/90 relative"
            variant="default"
            disabled={isAuthLoading || !isSignedIn}
          >
            {isLoadingStats ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Glasaj
            
            {rangeVotes > 0 && (
              <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-serbia-blue text-white text-xs font-bold rounded-full min-w-7 h-7 px-2 flex items-center justify-center shadow-sm border border-white">
                {rangeVotes}
              </div>
            )}
          </Button>
        </div>
      );
    }
    
    return null;
  };

  const renderVoteOptions = () => {
    const isLoading = isLoadingStats || isLoadingUserVote || isCastingVote || isRemovingVote;
    const isDisabled = isLoading || isAuthLoading || !isSignedIn;

    // Debug rendering state
    console.log(`[Debug VoteCard ${id}] Rendering options:`, {
      type,
      isLoading,
      isDisabled,
      voteStatsAvailable: !!voteStats,
      options: processedOptions
    });

    if (isLoading) {
      return (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      );
    }

    switch (type) {
      case "yesno":
        const yesVotes = voteStats?.breakdown?.['yes'] || 0;
        const noVotes = voteStats?.breakdown?.['no'] || 0;
        const totalYesNoVotes = yesVotes + noVotes;
        
        // Debug Yes/No votes
        console.log(`[Debug YesNo ${id}] Yes/No votes:`, {
          yes: yesVotes,
          no: noVotes,
          total: totalYesNoVotes,
          breakdown: voteStats?.breakdown
        });
        
        return (
          <div className="flex flex-col gap-4 mt-4">
            {/* Vote stats card */}
            {totalYesNoVotes > 0 && (
              <div className="w-full rounded-lg overflow-hidden flex flex-col sm:flex-row mb-2 h-4 text-xs font-medium"> 
                {/* Yes votes progress */}
                <div 
                  className={cn( // Use cn helper for conditional class
                    "relative bg-green-100 flex items-center justify-center text-green-700 px-2",
                    yesVotes === 0 && "hidden" // Add hidden class if count is 0
                  )}
                  style={{ 
                    width: totalYesNoVotes > 0 ? `${(yesVotes / totalYesNoVotes) * 100}%` : '0%', 
                  }}
                >
                  <span className="z-10">{yesVotes}</span>
                </div>
                                
                {/* No votes progress */}
                <div 
                  className={cn( // Use cn helper for conditional class
                    "relative bg-red-100 flex items-center justify-center text-red-700 px-2",
                    noVotes === 0 && "hidden" // Add hidden class if count is 0
                  )}
                  style={{ 
                    width: totalYesNoVotes > 0 ? `${(noVotes / totalYesNoVotes) * 100}%` : '0%', 
                  }}
                >
                  <span className="z-10">{noVotes}</span>
                </div>
              </div>
            )}
            
            {/* Voting buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => handleVote("yes")}
                className={cn(
                  // Base style: Outline, gray border, gray hover, specific text color
                  "flex-1 text-green-700 border border-gray-300 hover:bg-gray-100 transition-all py-3 text-base", 
                  // Selection style: Blue border (No longer depends on !isLoading)
                  selectedOption === "yes" && "border-2 border-serbia-blue", 
                  // Dim unselected (No longer depends on !isLoading)
                  selectedOption && selectedOption !== "yes" && "opacity-60"
                )}
                variant="outline"
                disabled={isDisabled}
              >
                <div className="flex items-center justify-center w-full">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <ThumbsUp className="mr-2 h-5 w-5" />
                  )}
                  <span className="font-medium">Za</span>
                  {/* Selection style: Blue checkmark (No longer depends on !isLoading) */}
                  {selectedOption === "yes" && <CheckCircle2 className="ml-2 h-5 w-5 text-serbia-blue" />}
                </div>
              </Button>
              
              <Button
                onClick={() => handleVote("no")}
                className={cn(
                  // Base style: Outline, gray border, gray hover, specific text color
                  "flex-1 text-red-700 border border-gray-300 hover:bg-gray-100 transition-all py-3 text-base", 
                   // Selection style: Blue border (No longer depends on !isLoading)
                  selectedOption === "no" && "border-2 border-serbia-blue", 
                  // Dim unselected (No longer depends on !isLoading)
                  selectedOption && selectedOption !== "no" && "opacity-60"
                )}
                variant="outline"
                disabled={isDisabled}
              >
                <div className="flex items-center justify-center w-full">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <ThumbsDown className="mr-2 h-5 w-5" />
                  )}
                  <span className="font-medium">Protiv</span>
                  {/* Selection style: Blue checkmark (No longer depends on !isLoading) */}
                  {selectedOption === "no" && <CheckCircle2 className="ml-2 h-5 w-5 text-serbia-blue" />}
                </div>
              </Button>
            </div>
          </div>
        );
      case "multiple":
        const totalMultipleVotes = processedOptions.reduce((sum, option) => sum + (voteStats?.breakdown?.[option] || 0), 0);
        
        // Debug multiple choice votes
        console.log(`[Debug Multiple ${id}] Multiple choice votes:`, {
          totalVotes: totalMultipleVotes,
          options: processedOptions,
          voteCounts: processedOptions.map(option => ({
            option,
            votes: voteStats?.breakdown?.[option] || 0
          })),
          breakdown: voteStats?.breakdown
        });
        
        return (
          <div className="flex flex-col gap-3 mt-4">
            {totalMultipleVotes > 0 && (
              <div className="bg-gray-50 p-2 rounded-lg mb-2 border border-gray-200">
                <p className="text-sm text-center text-gray-600">Ukupno glasova: <span className="font-semibold">{totalMultipleVotes}</span></p>
              </div>
            )}
          
            {processedOptions.map((option, index) => {
              const voteCount = voteStats?.breakdown?.[option] || 0;
              const percentage = totalMultipleVotes > 0 ? Math.round((voteCount / totalMultipleVotes) * 100) : 0;
              
              return (
                <div key={index} className="relative">
                  <Button
                    onClick={() => handleVote(option)}
                    className={cn(
                      "w-full justify-between text-left bg-gray-50 hover:bg-gray-100 text-gray-800 border transition-all py-5 px-4 h-auto",
                      !isLoading && selectedOption === option && "bg-blue-50 text-blue-700 border-blue-200"
                    )}
                    variant="outline"
                    disabled={isDisabled}
                  >
                    <span className="font-medium">{option}</span>
                    <span className="flex items-center">
                      {isLoading ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      ) : !isLoading && selectedOption === option ? (
                        <CheckCircle2 className="ml-2 h-4 w-4 text-blue-600" />
                      ) : null}
                    </span>
                  </Button>
                  
                  {!isLoading && voteCount > 0 && (
                    <>
                      {/* Vote count badge */}
                      <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-blue-600 text-white text-xs font-bold rounded-full min-w-7 h-7 px-2 flex items-center justify-center shadow-sm border border-white">
                        {voteCount}
                      </div>
                      
                      {/* Progress bar */}
                      <div className="absolute bottom-0 left-0 h-1.5 bg-blue-500 rounded-b-md" style={{ width: `${percentage}%` }}></div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      case "range":
        // Calculate total votes for range
        const rangeVotes = Object.values(voteStats?.breakdown || {}).reduce((sum, count) => sum + count, 0);
        
        // Build distribution data for range votes with proper typing
        const rangeDistribution: Record<string, number> = {};
        
        // Populate the distribution
        for (let i = min; i <= max; i++) {
          rangeDistribution[i.toString()] = voteStats?.breakdown?.[i.toString()] || 0;
        }
        
        // Find popular choices with proper typing
        const sortedChoices = Object.entries(rangeDistribution)
          .sort(([, countA], [, countB]) => countB - countA)
          .slice(0, 3)
          .filter(([, count]) => count > 0);
        
        // Debug range votes
        console.log(`[Debug Range ${id}] Range votes:`, {
          totalVotes: rangeVotes,
          distribution: rangeDistribution,
          popularChoices: sortedChoices,
          breakdown: voteStats?.breakdown
        });
        
        return (
          <div className="mt-4">
            {rangeVotes > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200">
                <p className="text-sm text-center text-gray-600 mb-2">Ukupno glasova: <span className="font-semibold">{rangeVotes}</span></p>
                
                {sortedChoices.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-1">
                    {sortedChoices.map(([value, count]) => (
                      <div 
                        key={value} 
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                          value === sortedChoices[0][0] ? "bg-serbia-blue/20 text-serbia-blue" : "bg-gray-200 text-gray-700"
                        )}
                      >
                        {value} meseci
                        <span className={cn(
                          "inline-flex items-center justify-center rounded-full px-1.5 text-xs font-bold",
                          value === sortedChoices[0][0] ? "bg-serbia-blue text-white" : "bg-gray-500 text-white"
                        )}>
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          
            <div className="mb-2 flex justify-between text-xs text-gray-500">
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
              className="w-full mt-6 bg-serbia-blue hover:bg-serbia-blue/90 relative"
              variant="default"
              disabled={isDisabled}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Glasaj
              
              {rangeVotes > 0 && (
                <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-serbia-blue text-white text-xs font-bold rounded-full min-w-7 h-7 px-2 flex items-center justify-center shadow-sm border border-white">
                  {rangeVotes}
                </div>
              )}
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
