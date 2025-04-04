
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SuggestRequestForm } from "./SuggestRequestForm";
import { SuggestedRequestCard } from "./SuggestedRequestCard";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SuggestedRequest {
  id: string;
  title: string;
  description: string;
  author: string;
  timestamp: string;
  votes: number;
}

interface SuggestedRequestsSectionProps {
  categoryId: string;
}

export function SuggestedRequestsSection({ categoryId }: SuggestedRequestsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [suggestedRequests, setSuggestedRequests] = useState<SuggestedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const itemsPerPage = 5;
  const totalPages = Math.ceil(suggestedRequests.length / itemsPerPage);
  
  // Get current items
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = suggestedRequests.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    fetchRequests();
  }, [categoryId]);

  async function fetchRequests() {
    setIsLoading(true);
    try {
      // Fetch requests from Supabase
      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          title,
          description,
          created_at,
          profiles:user_id(username, full_name),
          votes:votes(count)
        `)
        .eq('category_id', categoryId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching requests:", error);
        toast({
          title: "Greška",
          description: "Nije moguće učitati predloge zahteva.",
          variant: "destructive"
        });
      } else if (data) {
        // Format the data for our component
        const formattedData = data.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          author: item.profiles?.full_name || item.profiles?.username || "Anonimni korisnik",
          timestamp: new Date(item.created_at).toLocaleDateString('sr-RS', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          votes: item.votes?.length || 0
        }));
        
        setSuggestedRequests(formattedData);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSuccess = () => {
    setShowForm(false);
    fetchRequests();
  };

  // Handle pagination
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <div className="mt-6 pt-2">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-600">
          Predlozi građana ({suggestedRequests.length})
        </h3>
        
        <div className="flex items-center gap-2">
          {suggestedRequests.length > 5 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs gap-1 text-gray-600"
              onClick={toggleExpanded}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span>Smanji</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span>Proširi</span>
                </>
              )}
            </Button>
          )}
          
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-gray-600">
                <Plus className="h-3.5 w-3.5" />
                <span>Dodaj predlog</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Predloži novi zahtev</DialogTitle>
              </DialogHeader>
              <SuggestRequestForm categoryId={categoryId} onSuccess={handleSuccess} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-3 bg-gray-50 rounded-md">
          <p className="text-xs text-gray-500">Učitavanje predloga...</p>
        </div>
      ) : suggestedRequests.length > 0 ? (
        <div className="border rounded-md bg-white">
          <ScrollArea className={expanded ? "max-h-[400px]" : ""}>
            <div>
              {currentItems.map((request) => (
                <SuggestedRequestCard
                  key={request.id}
                  id={request.id}
                  title={request.title}
                  description={request.description}
                  author={request.author}
                  timestamp={request.timestamp}
                  votes={request.votes}
                />
              ))}
            </div>
          </ScrollArea>
          
          {totalPages > 1 && (
            <div className="py-2 px-3 border-t">
              <Pagination>
                <PaginationContent>
                  {currentPage > 1 && (
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(currentPage - 1);
                        }} 
                      />
                    </PaginationItem>
                  )}
                  
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                    // Calculate page numbers to show
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = index + 1;
                    } else if (currentPage <= 3) {
                      pageNum = index + 1;
                      if (index === 4) pageNum = totalPages;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + index;
                      if (index === 0) pageNum = 1;
                    } else {
                      pageNum = currentPage - 2 + index;
                      if (index === 0) pageNum = 1;
                      if (index === 4) pageNum = totalPages;
                    }
                    
                    return (
                      <PaginationItem key={index}>
                        <PaginationLink 
                          href="#" 
                          isActive={currentPage === pageNum}
                          onClick={(e) => {
                            e.preventDefault();
                            goToPage(pageNum);
                          }}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  {currentPage < totalPages && (
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(currentPage + 1);
                        }} 
                      />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-3 bg-gray-50 rounded-md">
          <p className="text-xs text-gray-500">Još uvek nema predloženih zahteva.</p>
          <Button 
            variant="link" 
            onClick={() => setShowForm(true)}
            className="mt-1 text-xs h-auto p-0"
          >
            Budite prvi koji će predložiti zahtev
          </Button>
        </div>
      )}
    </div>
  );
}
