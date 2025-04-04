
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X, User, LogIn } from "lucide-react";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const topics = [
    { name: "Mediji", href: "#mediji" },
    { name: "Izborni uslovi", href: "#izborni-uslovi" },
    { name: "Službe bezbednosti", href: "#sluzbe-bezbednosti" },
    { name: "Pravosuđe", href: "#pravosudje" },
    { name: "Prelazna vlada", href: "#prelazna-vlada" }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 bg-white z-50 shadow-sm">
      <div className="container flex items-center justify-between h-20 px-4 md:px-6">
        <div className="flex items-center">
          <a href="/" className="flex items-center">
            <div className="flex flex-col items-start">
              <span className="text-xl font-bold text-serbia-blue">Građanski Zahtevi</span>
              <span className="text-xs text-gray-500">Platforma za demokratsku saradnju</span>
            </div>
          </a>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-serbia-blue"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>

        {/* Desktop menu */}
        <nav className="hidden md:flex items-center gap-4 overflow-x-auto">
          {topics.map((topic) => (
            <a 
              key={topic.name}
              href={topic.href} 
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-serbia-blue transition-colors whitespace-nowrap"
            >
              {topic.name}
            </a>
          ))}
          
          <div className="flex items-center gap-3 ml-4">
            <Button variant="outline" className="border-serbia-blue text-serbia-blue hover:bg-serbia-blue/10">
              <LogIn className="mr-2 h-4 w-4" />
              Prijavi se
            </Button>
            <Button className="bg-serbia-blue hover:bg-serbia-blue/90 text-white">
              <User className="mr-2 h-4 w-4" />
              Registruj se
            </Button>
          </div>
        </nav>
      </div>

      {/* Mobile menu dropdown */}
      {isMenuOpen && (
        <div className="bg-white shadow-md md:hidden">
          <div className="px-4 py-6 space-y-4">
            {topics.map((topic) => (
              <a 
                key={topic.name}
                href={topic.href} 
                className="block text-sm font-medium text-gray-600 hover:text-serbia-blue py-2"
              >
                {topic.name}
              </a>
            ))}
            
            <div className="flex flex-col gap-3 pt-2">
              <Button variant="outline" className="w-full border-serbia-blue text-serbia-blue hover:bg-serbia-blue/10">
                <LogIn className="mr-2 h-4 w-4" />
                Prijavi se
              </Button>
              <Button className="w-full bg-serbia-blue hover:bg-serbia-blue/90 text-white">
                <User className="mr-2 h-4 w-4" />
                Registruj se
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
