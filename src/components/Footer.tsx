
import { Button } from "@/components/ui/button";
import { Mail, ExternalLink, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t">
      <div className="container px-4 py-12 mx-auto md:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold text-serbia-blue">Građanski Zahtevi</h3>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Platforma za demokratsku saradnju i glasanje o zahtevima građana. 
              Cilj platforme je da omogući građanima da izraze svoje mišljenje i
              zajednički formiraju zahteve za bolju budućnost Srbije.
            </p>
            <div className="mt-6 flex space-x-4">
              <Button variant="outline" size="sm" className="rounded-full">
                <Mail className="h-4 w-4 mr-2" />
                Kontaktirajte nas
              </Button>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-500 tracking-wider">Platformа</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="#" className="text-gray-600 hover:text-serbia-blue transition-colors">
                  O platformi
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-serbia-blue transition-colors">
                  Kako funkcioniše
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-serbia-blue transition-colors">
                  Prijavi problem
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-serbia-blue transition-colors flex items-center">
                  Github
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-500 tracking-wider">Pravno</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="#" className="text-gray-600 hover:text-serbia-blue transition-colors">
                  Uslovi korišćenja
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-serbia-blue transition-colors">
                  Politika privatnosti
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-serbia-blue transition-colors">
                  Kolačići
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 border-t pt-8">
          <p className="text-center text-gray-500 text-sm flex items-center justify-center">
            &copy; {new Date().getFullYear()} Građanski Zahtevi. Napravljeno sa 
            <Heart className="h-4 w-4 mx-1 text-serbia-red" /> 
            za Srbiju.
          </p>
        </div>
      </div>
    </footer>
  );
}
