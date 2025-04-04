
import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface SuggestedRequestCardProps {
  id: string;
  title: string;
  description: string;
  author: string;
  timestamp: string;
  votes: number;
}

export function SuggestedRequestCard({ 
  id, 
  title, 
  description, 
  author, 
  timestamp, 
  votes 
}: SuggestedRequestCardProps) {
  const [voteCount, setVoteCount] = React.useState(votes);
  const [hasVoted, setHasVoted] = React.useState(false);
  const { toast } = useToast();

  const handleVote = () => {
    if (!hasVoted) {
      setVoteCount(prev => prev + 1);
      setHasVoted(true);
      
      toast({
        title: "Glas zabeležen",
        description: "Hvala na vašem glasu za ovaj predlog zahteva."
      });
    } else {
      setVoteCount(prev => prev - 1);
      setHasVoted(false);
      
      toast({
        title: "Glas povučen",
        description: "Vaš glas za ovaj predlog zahteva je povučen."
      });
    }
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
          <div className="truncate mr-4">
            <span className="font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm whitespace-nowrap">
              <ThumbsUp className="h-3.5 w-3.5" />
              <span>{voteCount}</span>
            </div>
            <Button 
              variant={hasVoted ? "outline" : "default"} 
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleVote}
            >
              {hasVoted ? "Povučeno" : "Podrži"}
            </Button>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="text-xs text-gray-600">{description}</p>
          <div className="text-xs text-gray-500 pt-1">
            Predloženo: {timestamp}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
