import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, MessageSquare, Calendar } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useVoteOnSuggestedRequest } from "@/hooks/use-queries";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

interface SuggestedRequestCardProps {
  id: string;
  title: string;
  description: string;
  voteCount: number;
  hasVoted?: boolean;
  userVote?: number;
  categories?: { id: string; name: string }[];
  createdAt: string;
}

export function SuggestedRequestCard({
  id,
  title,
  description,
  voteCount,
  hasVoted,
  userVote,
  categories = [],
  createdAt,
}: SuggestedRequestCardProps) {
  const { isSignedIn, user } = useUser();
  const { toast } = useToast();
  const { mutate: voteOnSuggestion, isPending: isVoting } = useVoteOnSuggestedRequest();

  // Format the date
  const formattedDate = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
    locale: enUS
  });

  const handleVote = (value: number) => {
    if (!isSignedIn || !user) {
      toast({
        title: "Potrebno je da se prijavite",
        description: "Morate biti prijavljeni da biste glasali za predlog.",
        variant: "destructive",
      });
      return;
    }

    voteOnSuggestion(
      { suggestedRequestId: id, value },
      {
        onSuccess: () => {
          toast({
            title: "Glas zabeležen",
            description: "Vaš glas za ovaj predlog je uspešno zabeležen.",
          });
        },
        onError: (error) => {
          toast({
            title: "Greška",
            description: error.message || "Došlo je do greške prilikom glasanja.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-2 line-clamp-2">{title}</h3>
        <p className="text-gray-600 text-sm line-clamp-3 mb-4">{description}</p>
        
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((category) => (
              <Badge key={category.id} variant="secondary" className="px-2 py-1">
                {category.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>{formattedDate}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button 
            size="sm" 
            variant={(hasVoted || userVote === 1) ? "default" : "outline"} 
            className="h-8 px-2"
            onClick={() => handleVote(1)}
            disabled={isVoting}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            <span>{voteCount || 0}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
