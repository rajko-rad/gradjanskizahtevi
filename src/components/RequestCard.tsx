import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  MessageSquare, 
  ThumbsUp, 
  Calendar, 
  CheckCheck,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { sr } from "date-fns/locale";

interface RequestCardProps {
  id: string;
  title: string;
  description: string;
  slug: string;
  status: "active" | "closed" | "pending";
  commentCount: number;
  voteCount: number;
  createdAt: string;
  deadline?: string;
  progress?: number;
  categorySlug?: string;
}

export function RequestCard({ 
  id, 
  title, 
  description, 
  slug, 
  status, 
  commentCount, 
  voteCount, 
  createdAt, 
  deadline, 
  progress,
  categorySlug
}: RequestCardProps) {
  // Format the dates
  const formattedDate = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
    locale: sr
  });
  
  const formattedDeadline = deadline ? formatDistanceToNow(new Date(deadline), {
    addSuffix: true,
    locale: sr
  }) : null;

  const getStatusDetails = () => {
    switch (status) {
      case "active":
        return {
          label: "Aktivan",
          color: "bg-green-100 text-green-800",
          icon: <CheckCheck className="h-3 w-3" />
        };
      case "closed":
        return {
          label: "Zatvoren",
          color: "bg-gray-100 text-gray-800",
          icon: <CheckCheck className="h-3 w-3" />
        };
      case "pending":
        return {
          label: "U obradi",
          color: "bg-yellow-100 text-yellow-800",
          icon: <Clock className="h-3 w-3" />
        };
      default:
        return {
          label: "Nepoznato",
          color: "bg-gray-100 text-gray-800",
          icon: <Clock className="h-3 w-3" />
        };
    }
  };

  const statusDetails = getStatusDetails();
  const basePath = categorySlug ? `/kategorije/${categorySlug}/zahtevi` : '/zahtevi';

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <Badge 
            variant="outline" 
            className={cn("flex items-center gap-1 px-2 py-1", statusDetails.color)}
          >
            {statusDetails.icon}
            <span>{statusDetails.label}</span>
          </Badge>
          <Link
            to={`${basePath}/${slug}`}
            className="text-serbia-blue hover:underline flex items-center gap-1"
          >
            <span className="text-sm">Detalji</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <h3 className="text-lg font-semibold mb-2 line-clamp-2">{title}</h3>
        <p className="text-gray-600 text-sm line-clamp-3 mb-4">{description}</p>

        {progress !== undefined && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div 
              className="bg-serbia-blue h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </CardContent>

      <CardFooter className="px-6 py-4 border-t bg-gray-50 flex flex-wrap gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
            <ThumbsUp className="h-3 w-3" />
            <span>{voteCount}</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
            <MessageSquare className="h-3 w-3" />
            <span>{commentCount}</span>
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>
          
          {formattedDeadline && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>Rok: {formattedDeadline}</span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
} 