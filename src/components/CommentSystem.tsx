import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThumbsUp, ThumbsDown, Reply, MoreHorizontal, Loader2 } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { sr } from "date-fns/locale";
import { Comment } from "@/services/comments";
import { 
  useAddComment, 
  useUpdateComment, 
  useDeleteComment, 
  useVoteOnComment 
} from "@/hooks/use-queries";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/clerk-react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";

interface CommentWithMetadata extends Comment {
  votes?: number;
  userVote?: -1 | 1 | null;
  replies?: CommentWithMetadata[];
}

interface CommentSystemProps {
  requestId: string;
  comments: CommentWithMetadata[];
}

export function CommentSystem({ requestId, comments }: CommentSystemProps) {
  const [commentText, setCommentText] = useState("");
  const { mutate: addComment, isPending: isAddingComment } = useAddComment();
  const { toast } = useToast();
  const { user } = useUser();
  const { canVote, tokenVerified } = useSupabaseAuth();

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    if (!canVote || !tokenVerified) {
      toast({
        title: "Greška",
        description: "Morate biti prijavljeni da biste dodali komentar.",
        variant: "destructive",
      });
      return;
    }

    addComment(
      { requestId, content: commentText },
      {
        onSuccess: () => {
          setCommentText("");
          toast({
            title: "Komentar dodat",
            description: "Vaš komentar je uspešno dodat.",
          });
        },
        onError: (error) => {
          toast({
            title: "Greška",
            description: error.message || "Došlo je do greške prilikom dodavanja komentara.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="comment-card">
        <Textarea
          placeholder="Dodajte komentar..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="min-h-[80px]"
          disabled={isAddingComment}
        />
        <div className="flex justify-end mt-2">
          <Button 
            size="sm"
            disabled={!commentText.trim() || isAddingComment}
            onClick={handleAddComment}
          >
            {isAddingComment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pošalji
          </Button>
        </div>
      </div>

      {comments.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          Još uvek nema komentara. Budite prvi koji će komentarisati!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentThread 
              key={comment.id} 
              comment={comment}
              requestId={requestId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentThread({ 
  comment, 
  requestId 
}: { 
  comment: CommentWithMetadata;
  requestId: string;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editText, setEditText] = useState(comment.content);
  const [showFullComment, setShowFullComment] = useState(false);
  
  const { user } = useUser();
  const { toast } = useToast();
  const { canVote, tokenVerified } = useSupabaseAuth();
  
  const { mutate: addComment, isPending: isAddingReply } = useAddComment();
  const { mutate: updateComment, isPending: isUpdatingComment } = useUpdateComment();
  const { mutate: deleteComment, isPending: isDeletingComment } = useDeleteComment();
  const { mutate: voteOnComment, isPending: isVoting } = useVoteOnComment();
  
  const isLongComment = comment.content.length > 300;
  const displayContent = isLongComment && !showFullComment 
    ? comment.content.substring(0, 300) + "..." 
    : comment.content;

  const isAuthor = user?.id === comment.user_id;
  const voteCount = comment.votes || 0;
  const userVoteValue = comment.userVote || null;

  // Format the date
  const formattedDate = comment.created_at 
    ? formatDistanceToNow(new Date(comment.created_at), {
        addSuffix: true,
        locale: sr
      })
    : "Nedavno";

  const handleVote = (value: -1 | 1) => {
    if (!canVote || !tokenVerified) {
      toast({
        title: "Greška",
        description: "Morate biti prijavljeni da biste glasali.",
        variant: "destructive",
      });
      return;
    }

    // If user already voted this way, this will remove their vote
    voteOnComment(
      { commentId: comment.id, value, requestId },
      {
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

  const handleReply = () => {
    if (!replyText.trim()) return;
    if (!canVote || !tokenVerified) {
      toast({
        title: "Greška",
        description: "Morate biti prijavljeni da biste dodali odgovor.",
        variant: "destructive",
      });
      return;
    }

    addComment(
      { 
        requestId, 
        content: replyText,
        parentId: comment.id
      },
      {
        onSuccess: () => {
          setReplyText("");
          setIsReplying(false);
          toast({
            title: "Odgovor dodat",
            description: "Vaš odgovor je uspešno dodat.",
          });
        },
        onError: (error) => {
          toast({
            title: "Greška",
            description: error.message || "Došlo je do greške prilikom dodavanja odgovora.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!editText.trim() || editText === comment.content) {
      setIsEditing(false);
      setEditText(comment.content);
      return;
    }
    if (!canVote || !tokenVerified) {
      toast({
        title: "Greška",
        description: "Morate biti prijavljeni da biste uredili komentar.",
        variant: "destructive",
      });
      return;
    }

    updateComment(
      { 
        commentId: comment.id, 
        content: editText,
        requestId
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast({
            title: "Komentar ažuriran",
            description: "Vaš komentar je uspešno ažuriran.",
          });
        },
        onError: (error) => {
          toast({
            title: "Greška",
            description: error.message || "Došlo je do greške prilikom ažuriranja komentara.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!confirm("Da li ste sigurni da želite da obrišete ovaj komentar?")) {
      return;
    }

    deleteComment(
      { commentId: comment.id, requestId },
      {
        onSuccess: () => {
          toast({
            title: "Komentar obrisan",
            description: "Vaš komentar je uspešno obrisan.",
          });
        },
        onError: (error) => {
          toast({
            title: "Greška",
            description: error.message || "Došlo je do greške prilikom brisanja komentara.",
            variant: "destructive",
          });
        },
      }
    );
  };

  // Extract user initials for avatar
  const userInitials = user?.fullName 
    ? user.fullName.split(' ').map(name => name[0]).join('').toUpperCase().substring(0, 2)
    : 'KO';

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <div className="flex gap-2">
        <Avatar className="h-8 w-8">
          {user?.imageUrl ? (
            <AvatarImage src={user.imageUrl} alt={user?.fullName || 'Korisnik'} />
          ) : (
            <AvatarFallback className="bg-serbia-blue text-white text-xs">
              {userInitials}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{user?.fullName || 'Korisnik'}</span>
              <span className="text-xs text-gray-500">{formattedDate}</span>
            </div>
            
            {isAuthor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-gray-500 hover:text-gray-700">
                    <MoreHorizontal size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setIsEditing(true);
                    setEditText(comment.content);
                  }}>
                    Uredi
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete}>
                    Obriši
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {isEditing ? (
            <div className="mt-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[80px] text-sm"
                disabled={isUpdatingComment}
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.content);
                  }}
                  disabled={isUpdatingComment}
                >
                  Otkaži
                </Button>
                <Button 
                  size="sm"
                  onClick={handleUpdate}
                  disabled={!editText.trim() || isUpdatingComment}
                >
                  {isUpdatingComment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sačuvaj
                </Button>
              </div>
            </div>
          ) : (
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
          )}
          
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center">
              <button 
                className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                onClick={() => handleVote(1)}
                disabled={isVoting}
              >
                <ThumbsUp 
                  size={16} 
                  className={userVoteValue === 1 ? "text-serbia-blue fill-serbia-blue" : ""} 
                />
              </button>
              <span className="text-sm mx-1">{voteCount}</span>
              <button 
                className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                onClick={() => handleVote(-1)}
                disabled={isVoting}
              >
                <ThumbsDown 
                  size={16} 
                  className={userVoteValue === -1 ? "text-red-500 fill-red-500" : ""} 
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
          </div>
          
          {isReplying && (
            <div className="mt-3">
              <Textarea
                placeholder="Napiši odgovor..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[60px] text-sm"
                disabled={isAddingReply}
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyText("");
                  }}
                  disabled={isAddingReply}
                >
                  Otkaži
                </Button>
                <Button 
                  size="sm"
                  onClick={handleReply}
                  disabled={!replyText.trim() || isAddingReply}
                >
                  {isAddingReply && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Odgovori
                </Button>
              </div>
            </div>
          )}
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 pl-4 border-l-2 border-gray-100 space-y-3">
              {comment.replies.map((reply) => (
                <CommentThread 
                  key={reply.id} 
                  comment={reply}
                  requestId={requestId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
