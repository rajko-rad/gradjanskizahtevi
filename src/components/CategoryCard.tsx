
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface CategoryCardProps {
  id: string;
  title: string;
  description: string;
  count: number;
}

export function CategoryCard({ id, title, description, count }: CategoryCardProps) {
  return (
    <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{count} zahteva</span>
          <Button variant="ghost" size="sm" asChild>
            <a href={`/category/${id}`} className="flex items-center">
              Pogledaj sve
              <ChevronRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
