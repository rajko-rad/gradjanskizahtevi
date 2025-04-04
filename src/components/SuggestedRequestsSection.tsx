
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
    <div className="mt-8 border-t pt-6 border-serbia-blue/10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-serbia-blue">Predloženi zahtevi</h3>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span>Predloži zahtev</span>
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
        <div className="grid grid-cols-1 gap-4">
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
        <div className="text-center py-6 bg-gray-50 rounded-md">
          <p className="text-gray-500">Još uvek nema predloženih zahteva za ovu kategoriju.</p>
          <Button 
            variant="link" 
            onClick={() => setShowForm(true)}
            className="mt-2"
          >
            Budite prvi koji će predložiti zahtev
          </Button>
        </div>
      )}
    </div>
  );
}
