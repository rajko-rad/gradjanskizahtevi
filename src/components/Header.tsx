
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white z-50 shadow-sm">
      <div className="container flex items-center justify-between h-16 px-4 md:px-6">
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
            className="text-black"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>

        {/* Desktop menu */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#" className="text-sm font-medium hover:text-primary transition-colors">O platformi</a>
          <a href="#" className="text-sm font-medium hover:text-primary transition-colors">Zahtevi</a>
          <Button className="bg-serbia-blue hover:bg-serbia-blue/90 text-white">
            Prijavi se
          </Button>
        </nav>
      </div>

      {/* Mobile menu dropdown */}
      {isMenuOpen && (
        <div className="bg-white shadow-md md:hidden">
          <div className="px-4 py-4 space-y-4">
            <a href="#" className="block text-sm font-medium hover:text-primary">O platformi</a>
            <a href="#" className="block text-sm font-medium hover:text-primary">Zahtevi</a>
            <Button className="w-full bg-serbia-blue hover:bg-serbia-blue/90 text-white">
              Prijavi se
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
