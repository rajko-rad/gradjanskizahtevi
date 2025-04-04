
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SuggestRequestForm } from "./SuggestRequestForm";
import { SuggestedRequestCard } from "./SuggestedRequestCard";
import { suggestedRequests } from "@/data/mockData";
import { Plus } from "lucide-react";

interface SuggestedRequestsSectionProps {
  categoryId: string;
}

export function SuggestedRequestsSection({ categoryId }: SuggestedRequestsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [requests, setRequests] = useState(
    suggestedRequests.filter(request => request.categoryId === categoryId)
  );

  const handleSuccess = () => {
    setShowForm(false);
  };

  return (
    <div className="mt-6 pt-2">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-600">Predlozi građana</h3>
        
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
      
      {requests.length > 0 ? (
        <div className="border rounded-md bg-white">
          {requests.map((request) => (
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
