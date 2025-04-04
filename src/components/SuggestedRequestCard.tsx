
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, User, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="flex items-center text-sm gap-1 mt-1">
          <User className="h-3.5 w-3.5" />
          <span>{author}</span>
          <span className="mx-1">•</span>
          <Clock className="h-3.5 w-3.5" />
          <span>{timestamp}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">{description}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="flex items-center gap-1 text-sm">
          <ThumbsUp className="h-4 w-4" />
          <span>{voteCount} glasova</span>
        </div>
        <Button 
          variant={hasVoted ? "outline" : "default"} 
          size="sm"
          onClick={handleVote}
        >
          {hasVoted ? "Povuci glas" : "Podrži"}
        </Button>
      </CardFooter>
    </Card>
  );
}
