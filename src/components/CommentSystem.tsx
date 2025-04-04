
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThumbsUp, ThumbsDown, Reply, MoreHorizontal } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

interface Comment {
  id: string;
  author: {
    name: string;
    initials: string;
  };
  content: string;
  timestamp: string;
  votes: number;
  replies: Comment[];
}

interface CommentSystemProps {
  comments: Comment[];
}

export function CommentSystem({ comments }: CommentSystemProps) {
  return (
    <div className="space-y-4 mt-4">
      <NewCommentForm />
      {comments.map((comment) => (
        <CommentThread key={comment.id} comment={comment} />
      ))}
    </div>
  );
}

function NewCommentForm() {
  const [commentText, setCommentText] = useState("");

  return (
    <div className="comment-card">
      <Textarea
        placeholder="Dodajte komentar..."
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        className="min-h-[80px]"
      />
      <div className="flex justify-end mt-2">
        <Button 
          size="sm"
          disabled={!commentText.trim()}
          onClick={() => setCommentText("")}
        >
          Pošalji
        </Button>
      </div>
    </div>
  );
}

function CommentThread({ comment }: { comment: Comment }) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [voteStatus, setVoteStatus] = useState<"up" | "down" | null>(null);
  const [showFullComment, setShowFullComment] = useState(false);
  
  const isLongComment = comment.content.length > 300;
  const displayContent = isLongComment && !showFullComment 
    ? comment.content.substring(0, 300) + "..." 
    : comment.content;

  const handleVote = (direction: "up" | "down") => {
    setVoteStatus(prevStatus => prevStatus === direction ? null : direction);
  };

  return (
    <div className="comment-card">
      <div className="flex gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-serbia-blue text-white text-xs">
            {comment.author.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.author.name}</span>
            <span className="text-xs text-gray-500">{comment.timestamp}</span>
          </div>
          <div className="mt-1">
            <p className="text-sm">{displayContent}</p>
            {isLongComment && (
              <button 
                onClick={() => setShowFullComment(!showFullComment)}
                className="text-xs text-blue-600 mt-1"
              >
                {showFullComment ? "Prikaži manje" : "Prikaži više"}
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center">
              <button 
                className="vote-button" 
                onClick={() => handleVote("up")}
              >
                <ThumbsUp 
                  size={16} 
                  className={voteStatus === "up" ? "text-serbia-blue fill-serbia-blue" : ""} 
                />
              </button>
              <span className="text-sm mx-1">{comment.votes}</span>
              <button 
                className="vote-button" 
                onClick={() => handleVote("down")}
              >
                <ThumbsDown 
                  size={16} 
                  className={voteStatus === "down" ? "text-red-500 fill-red-500" : ""} 
                />
              </button>
            </div>
            
            <button 
              className="text-xs text-gray-500 hover:text-primary flex items-center gap-1"
              onClick={() => setIsReplying(!isReplying)}
            >
              <Reply size={14} />
              Odgovori
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-gray-500 hover:text-primary">
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Prijavi</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {isReplying && (
            <div className="mt-3">
              <Textarea
                placeholder="Napiši odgovor..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[60px] text-sm"
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyText("");
                  }}
                >
                  Otkaži
                </Button>
                <Button 
                  size="sm"
                  disabled={!replyText.trim()}
                >
                  Odgovori
                </Button>
              </div>
            </div>
          )}
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="comment-thread">
              {comment.replies.map((reply) => (
                <CommentThread key={reply.id} comment={reply} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
