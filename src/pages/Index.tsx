
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VoteCard } from "@/components/VoteCard";
import { CommentSystem } from "@/components/CommentSystem";
import { categories, requests, mockComments } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  MessageSquare, 
  Info
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-28 pb-16 bg-gradient-to-br from-serbia-blue via-blue-700 to-serbia-blue text-white">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
              Građanski Zahtevi
            </h1>
            <p className="text-xl text-gray-100 md:text-2xl leading-relaxed">
              Platforma za glasanje i diskusiju o ključnim zahtevima građana Srbije
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button size="lg" className="bg-white text-serbia-blue hover:bg-gray-100 shadow-lg">
                Pregledaj zahteve
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/20">
                <Info className="mr-2 h-4 w-4" />
                Kako funkcioniše
              </Button>
            </div>
          </div>
        </div>
        
        {/* Hero Wave Decoration */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-0 transform">
          <svg className="relative block w-full h-10 transform" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="fill-white"></path>
          </svg>
        </div>
      </section>
      
      {/* Requests Grouped by Categories */}
      <section className="py-16">
        <div className="container px-4 md:px-6">
          {categories.map((category) => {
            const categoryRequests = requests.filter(req => req.categoryId === category.id);
            
            if (categoryRequests.length === 0) return null;
            
            return (
              <div key={category.id} className="mb-20">
                <div className="border-b-2 pb-4 mb-8 border-serbia-blue/20">
                  <h2 className="text-2xl font-bold text-serbia-blue">{category.title}</h2>
                  <p className="text-gray-600 mt-2">{category.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
      <section className="py-16 bg-gray-50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center">
            <div className="max-w-xl text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-serbia-blue mb-4">Nedavne diskusije</h2>
              <p className="text-gray-600 text-lg">
                Pridružite se diskusiji o najvažnijim zahtevima i izrazite svoje mišljenje
              </p>
            </div>
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-serbia-blue" />
                  Popularne diskusije
                </h3>
              </div>
              <CommentSystem comments={mockComments} />
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-serbia-blue to-blue-700 text-white">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Priključite se platformi</h2>
            <p className="text-xl text-gray-100 mb-8 leading-relaxed">
              Registrujte se kako biste aktivno učestvovali u glasanju i diskusijama o budućnosti Srbije
            </p>
            <Button size="lg" className="bg-white text-serbia-blue hover:bg-gray-100 shadow-lg px-8">
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
