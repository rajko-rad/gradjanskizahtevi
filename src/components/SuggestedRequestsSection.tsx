import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SuggestRequestForm } from "./SuggestRequestForm";
import { SuggestedRequestCard } from "./SuggestedRequestCard";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSuggestedRequests } from "@/hooks/use-queries";
import { Loader2 } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface SuggestedRequestsSectionProps {
  categoryId: string;
}

export function SuggestedRequestsSection({ categoryId }: SuggestedRequestsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const { data: suggestedRequests, isLoading, error } = useSuggestedRequests(categoryId);
  
  const itemsPerPage = 5;
  const totalPages = Math.ceil((suggestedRequests?.length || 0) / itemsPerPage);
  
  // Get current items
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = suggestedRequests?.slice(indexOfFirstItem, indexOfLastItem) || [];

  const handleSuccess = () => {
    setShowForm(false);
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
          Predlozi građana ({suggestedRequests?.length || 0})
        </h3>
        
        <div className="flex items-center gap-2">
          {suggestedRequests && suggestedRequests.length > 5 && (
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
          <Loader2 className="w-5 h-5 mx-auto animate-spin text-gray-400" />
          <p className="text-xs text-gray-500 mt-2">Učitavanje predloga...</p>
        </div>
      ) : error ? (
        <div className="text-center py-3 bg-gray-50 rounded-md">
          <p className="text-xs text-red-500">Došlo je do greške pri učitavanju predloga.</p>
        </div>
      ) : suggestedRequests && suggestedRequests.length > 0 ? (
        <div className="border rounded-md bg-white">
          <ScrollArea className={expanded ? "max-h-[400px]" : ""}>
            <div>
              {currentItems.map((request) => (
                <SuggestedRequestCard
                  key={request.id}
                  id={request.id}
                  title={request.title}
                  description={request.description}
                  voteCount={request.voteCount}
                  userVote={request.user_vote}
                  createdAt={request.created_at}
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
