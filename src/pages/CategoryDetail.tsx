import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VoteCard } from "@/components/VoteCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { categories, requests } from "@/data/mockData";

const CategoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const category = categories.find(cat => cat.id === id);
  const categoryRequests = requests.filter(req => req.categoryId === id);

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Kategorija nije pronađena</h1>
            <Button asChild>
              <a href="/">Povratak na početnu</a>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow pt-24 pb-12">
        <div className="container px-4 md:px-6">
          <Button variant="ghost" className="mb-6" asChild>
            <a href="/" className="flex items-center">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Povratak na kategorije
            </a>
          </Button>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{category.title}</h1>
            <p className="text-gray-500 mt-2">{category.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryRequests.length > 0 ? (
              categoryRequests.map((request) => (
                <VoteCard 
                  key={request.id}
                  id={request.id}
                  title={request.title}
                  description={request.description}
                  type={request.type as "yesno" | "multiple" | "range"}
                  options={request.options}
                  min={request.min}
                  max={request.max}
                  hasComments={request.hasComments}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">Nema zahteva u ovoj kategoriji</p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CategoryDetail;
