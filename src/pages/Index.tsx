
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CategoryCard } from "@/components/CategoryCard";
import { VoteCard } from "@/components/VoteCard";
import { CommentSystem } from "@/components/CommentSystem";
import { categories, requests, mockComments } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const Index = () => {
  const featuredRequests = requests.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-serbia-blue to-blue-800 text-white">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
              Građanski Zahtevi
            </h1>
            <p className="max-w-[700px] text-gray-200 md:text-xl">
              Platforma za glasanje i diskusiju o ključnim zahtevima građana Srbije
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Button size="lg" className="bg-white text-serbia-blue hover:bg-gray-100">
                Pregledaj zahteve
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/20">
                Kako funkcioniše
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Categories Section */}
      <section className="py-12 bg-gray-50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Kategorije zahteva</h2>
            <p className="text-gray-500 text-center mb-8 max-w-[600px]">
              Pregledajte kategorije i diskutujte o najvažnijim temama
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {categories.map((category) => (
                <CategoryCard 
                  key={category.id}
                  id={category.id}
                  title={category.title}
                  description={category.description}
                  count={category.count}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Requests Section */}
      <section className="py-12">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Aktuelni zahtevi</h2>
            <p className="text-gray-500 text-center mb-8 max-w-[600px]">
              Glasajte o trenutno najaktivnijim zahtevima
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {featuredRequests.map((request) => (
                <VoteCard 
                  key={request.id}
                  title={request.title}
                  description={request.description}
                  type={request.type as "yesno" | "multiple" | "range"}
                  options={request.options}
                  initialVotes={request.initialVotes}
                  hasComments={request.hasComments}
                />
              ))}
            </div>
            <div className="mt-8">
              <Button variant="outline" className="group">
                Pogledaj sve zahteve
                <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Recent Discussions */}
      <section className="py-12 bg-gray-50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Nedavne diskusije</h2>
            <p className="text-gray-500 text-center mb-8 max-w-[600px]">
              Pridružite se diskusiji o najvažnijim zahtevima
            </p>
            <div className="w-full max-w-3xl">
              <CommentSystem comments={mockComments} />
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-12 bg-serbia-blue text-white">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Priključite se platformi</h2>
            <p className="text-gray-200 mb-6 max-w-[600px]">
              Registrujte se kako biste aktivno učestvovali u glasanju i diskusijama
            </p>
            <Button size="lg" className="bg-white text-serbia-blue hover:bg-gray-100">
              Registruj se
            </Button>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Index;
