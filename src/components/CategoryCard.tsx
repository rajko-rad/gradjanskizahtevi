import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, UserCheck, Vote } from "lucide-react";
import { useCategoryStats } from "@/hooks/use-queries";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryCardProps {
  id: string;
  name: string;
  description: string;
  slug: string;
  icon?: string;
}

export function CategoryCard({ id, name, description, slug, icon }: CategoryCardProps) {
  const { data: stats, isLoading } = useCategoryStats(id);
  
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="mb-4 flex justify-between items-start">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-serbia-blue/10 text-serbia-blue">
            {icon ? (
              <img src={icon} alt={name} className="w-6 h-6" />
            ) : (
              <Vote className="w-6 h-6" />
            )}
          </div>
          <Link
            to={`/kategorije/${slug}`}
            className="text-serbia-blue hover:underline flex items-center gap-1"
          >
            <span className="text-sm">Pogledaj</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <h3 className="text-xl font-semibold mb-2">{name}</h3>
        <p className="text-gray-600 text-sm line-clamp-3 mb-4">{description}</p>
      </CardContent>

      <CardFooter className="px-6 py-4 border-t bg-gray-50 flex justify-between">
        {isLoading ? (
          <div className="w-full flex justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
        ) : (
          <>
            <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
              <UserCheck className="h-3 w-3" />
              <span>{stats?.totalVotes || 0} glasova</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
              <Vote className="h-3 w-3" />
              <span>{stats?.totalRequests || 0} zahteva</span>
            </Badge>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
