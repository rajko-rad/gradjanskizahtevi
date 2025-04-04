
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VoteCard } from "@/components/VoteCard";
import { CommentSystem } from "@/components/CommentSystem";
import { categories, requests, mockComments } from "@/data/mockData";
import { Button } from "@/components/ui/button";

const Index = () => {
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
      
      {/* Requests Grouped by Categories */}
      <section className="py-12">
        <div className="container px-4 md:px-6">
          {categories.map((category) => {
            const categoryRequests = requests.filter(req => req.categoryId === category.id);
            
            if (categoryRequests.length === 0) return null;
            
            return (
              <div key={category.id} className="mb-16">
                <div className="border-b pb-2 mb-6">
                  <h2 className="text-2xl font-bold">{category.title}</h2>
                  <p className="text-gray-500 mt-1">{category.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryRequests.map((request) => (
                    <VoteCard 
                      key={request.id}
                      title={request.title}
                      description={request.description}
                      type={request.type as "yesno" | "multiple" | "range"}
                      options={request.options}
                      min={request.min}
                      max={request.max}
                      initialVotes={request.initialVotes}
                      hasComments={request.hasComments}
                    />
                  ))}
                </div>
              </div>
            );
          })}
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
