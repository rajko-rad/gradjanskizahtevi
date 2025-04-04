
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VoteCard } from "@/components/VoteCard";
import { categories, requests, mockComments } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  FileText,
  Clock,
  Calendar
} from "lucide-react";

const Index = () => {
  // Timeline/events data
  const timelineEvents = [
    {
      id: 1,
      date: "15. april 2023.",
      title: "Protest studenata",
      description: "Studenti Univerziteta u Beogradu organizovali protest i postavili zahteve za reformu obrazovnog sistema.",
      source: "Studentski parlament"
    },
    {
      id: 2,
      date: "23. maj 2023.",
      title: "Građanski protest 'Srbija protiv nasilja'",
      description: "Masovni protesti širom Srbije nakon tragičnih događaja, sa zahtevima za promene u društvu.",
      source: "Građanske organizacije"
    },
    {
      id: 3,
      date: "7. jul 2023.",
      title: "Zahtevi akademske zajednice",
      description: "Grupa profesora i akademika objavila dokument sa zahtevima za reformu javnih institucija.",
      source: "Akademska zajednica"
    },
    {
      id: 4,
      date: "12. decembar 2023.",
      title: "Predlog izmena izbornog zakona",
      description: "Opozicione partije predstavile predlog izmena izbornog zakona za fer i slobodne izbore.",
      source: "Opozicione partije"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section with Topic Buttons */}
      <section className="pt-28 pb-16 bg-white text-serbia-blue border-b">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
              Građanski Zahtevi
            </h1>
            <p className="text-xl text-gray-600 md:text-2xl leading-relaxed">
              Platforma za glasanje i diskusiju o ključnim zahtevima građana Srbije
            </p>
            
            {/* Topic buttons in the banner */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full mt-8">
              {categories.map((category) => (
                <Button 
                  key={category.id}
                  variant="outline" 
                  className="text-serbia-blue border-serbia-blue/50 hover:bg-serbia-blue/10"
                  onClick={() => document.getElementById(category.id)?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {category.shortTitle}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Requests Grouped by Categories */}
      <section className="py-16">
        <div className="container px-4 md:px-6">
          {categories.map((category) => {
            const categoryRequests = requests.filter(req => req.categoryId === category.id);
            
            if (categoryRequests.length === 0) return null;
            
            return (
              <div key={category.id} id={category.id} className="mb-20">
                <div className="border-b-2 pb-4 mb-8 border-serbia-blue/20">
                  <h2 className="text-2xl font-bold text-serbia-blue">{category.title}</h2>
                  <p className="text-gray-600 mt-2">{category.description}</p>
                  
                  {/* Resources by category */}
                  {category.resources && category.resources.length > 0 && (
                    <div className="mt-4 pt-2 border-t border-serbia-blue/10">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Resursi i više informacija:</h3>
                      <div className="flex flex-wrap gap-2">
                        {category.resources.map((resource, index) => (
                          <a 
                            key={index} 
                            href={resource.url} 
                            className="inline-flex items-center text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-serbia-blue/10 hover:text-serbia-blue"
                          >
                            <FileText className="mr-1 h-3 w-3" />
                            {resource.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {categoryRequests.map((request) => (
                    <div key={request.id} className="flex flex-col h-full">
                      <VoteCard 
                        title={request.title}
                        description={request.description}
                        type={request.type as "yesno" | "multiple" | "range"}
                        options={request.options}
                        min={request.min}
                        max={request.max}
                        initialVotes={request.initialVotes}
                        hasComments={request.hasComments}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      
      {/* Timeline/Events Section */}
      <section className="py-16 bg-gray-50" id="aktuelno">
        <div className="container px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-serbia-blue mb-4">Aktuelno</h2>
              <p className="text-gray-600 text-lg">
                Pregled istorijskih događaja i inicijativa različitih društvenih aktera
              </p>
            </div>
            
            <div className="relative border-l-2 border-serbia-blue/30 pl-8 space-y-12 ml-4">
              {timelineEvents.map((event) => (
                <div key={event.id} className="relative">
                  <div className="absolute -left-12 mt-1.5 w-6 h-6 rounded-full bg-serbia-blue flex items-center justify-center">
                    <Calendar className="h-3 w-3 text-white" />
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <Clock className="h-4 w-4 mr-1" />
                      {event.date}
                    </div>
                    <h3 className="text-xl font-bold text-serbia-blue">{event.title}</h3>
                    <p className="text-gray-600 mt-2">{event.description}</p>
                    <p className="text-sm text-gray-500 mt-3 italic">Izvor: {event.source}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-serbia-blue text-white">
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
