
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CheckCircle2
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
                "flex-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-all",
                selectedOption === "yes" && "bg-green-100 border-green-300"
              )}
              variant="outline"
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              Da {votes["yes"] ? `(${votes["yes"]})` : ""}
              {selectedOption === "yes" && <CheckCircle2 className="ml-2 h-4 w-4 text-green-600" />}
            </Button>
            <Button
              onClick={() => handleVote("no")}
              className={cn(
                "flex-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-all",
                selectedOption === "no" && "bg-red-100 border-red-300"
              )}
              variant="outline"
            >
              <ThumbsDown className="mr-2 h-4 w-4" />
              Ne {votes["no"] ? `(${votes["no"]})` : ""}
              {selectedOption === "no" && <CheckCircle2 className="ml-2 h-4 w-4 text-red-600" />}
            </Button>
          </div>
        );
      case "multiple":
        return (
          <div className="flex flex-col gap-3 mt-6">
            {options.map((option, index) => (
              <Button
                key={index}
                onClick={() => handleVote(option)}
                className={cn(
                  "justify-between text-left bg-gray-50 hover:bg-gray-100 text-gray-800 border transition-all",
                  selectedOption === option && "bg-blue-50 text-blue-700 border-blue-200"
                )}
                variant="outline"
              >
                <span>{option}</span>
                <span className="flex items-center">
                  {votes[option] ? 
                    <span className="text-sm font-medium bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                      {votes[option]}
                    </span> : null}
                  {selectedOption === option && <CheckCircle2 className="ml-2 h-4 w-4 text-blue-600" />}
                </span>
              </Button>
            ))}
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
            />
            <div className="mt-3 text-center">
              <span className="text-sm font-medium bg-serbia-blue/10 text-serbia-blue px-3 py-1 rounded-full">
                {rangeValue} meseci
              </span>
            </div>
            <Button 
              onClick={() => handleVote(rangeValue.toString())}
              className="w-full mt-6 bg-serbia-blue hover:bg-serbia-blue/90"
              variant="default"
            >
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
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
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
