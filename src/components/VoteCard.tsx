
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VoteCardProps {
  title: string;
  description?: string;
  type: "yesno" | "multiple" | "range";
  options?: string[];
  min?: number;
  max?: number;
  hasComments?: boolean;
  initialVotes?: {[key: string]: number};
}

export function VoteCard({ 
  title, 
  description, 
  type, 
  options = [], 
  min = 3, 
  max = 18,
  hasComments = true,
  initialVotes = {} 
}: VoteCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [votes, setVotes] = useState(initialVotes);
  const [rangeValue, setRangeValue] = useState(min);

  const handleVote = (option: string) => {
    setSelectedOption(option);
    setVotes(prev => ({
      ...prev,
      [option]: (prev[option] || 0) + 1
    }));
  };

  const renderVoteOptions = () => {
    switch (type) {
      case "yesno":
        return (
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Button
              onClick={() => handleVote("yes")}
              className={cn(
                "flex-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200",
                selectedOption === "yes" && "bg-green-100 border-green-300"
              )}
              variant="outline"
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              Da {votes["yes"] ? `(${votes["yes"]})` : ""}
            </Button>
            <Button
              onClick={() => handleVote("no")}
              className={cn(
                "flex-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200",
                selectedOption === "no" && "bg-red-100 border-red-300"
              )}
              variant="outline"
            >
              <ThumbsDown className="mr-2 h-4 w-4" />
              Ne {votes["no"] ? `(${votes["no"]})` : ""}
            </Button>
          </div>
        );
      case "multiple":
        return (
          <div className="flex flex-col gap-3 mt-4">
            {options.map((option, index) => (
              <Button
                key={index}
                onClick={() => handleVote(option)}
                className={cn(
                  "justify-start text-left bg-gray-50 hover:bg-gray-100 text-gray-800 border",
                  selectedOption === option && "bg-blue-50 text-blue-700 border-blue-200"
                )}
                variant="outline"
              >
                {option} {votes[option] ? `(${votes[option]})` : ""}
              </Button>
            ))}
          </div>
        );
      case "range":
        return (
          <div className="mt-4">
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
              className="w-full"
            />
            <div className="mt-2 text-center">
              <span className="text-sm font-medium">{rangeValue} meseci</span>
            </div>
            <Button 
              onClick={() => handleVote(rangeValue.toString())}
              className="w-full mt-4"
              variant="default"
            >
              Glasaj
            </Button>
          </div>
        );
    }
  };

  return (
    <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {renderVoteOptions()}
        
        {hasComments && (
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full flex items-center justify-center text-gray-500"
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
                <p className="text-sm text-gray-500 text-center">
                  Prijavite se da biste komentarisali
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
