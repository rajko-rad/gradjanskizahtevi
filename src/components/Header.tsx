import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X, User, LogIn, LogOut } from "lucide-react";
import { useAuth, useUser, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const { user } = useUser();

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
        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-sm font-medium text-gray-600 hover:text-serbia-blue transition-colors">Zahtevi</a>
          <a href="#" className="text-sm font-medium text-gray-600 hover:text-serbia-blue transition-colors">Resursi</a>
          <a href="#" className="text-sm font-medium text-gray-600 hover:text-serbia-blue transition-colors">Aktuelno</a>
          
          <div className="flex items-center gap-3 ml-4">
            {isSignedIn ? (
              <div className="flex items-center gap-3">
                <Link to="/user-profile">
                  <div className="flex items-center gap-2">
                    <UserButton />
                    <span className="text-sm font-medium text-gray-700">{user?.firstName || 'Korisnik'}</span>
                  </div>
                </Link>
              </div>
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button variant="outline" className="border-serbia-blue text-serbia-blue hover:bg-serbia-blue/10">
                    <LogIn className="mr-2 h-4 w-4" />
                    Prijavi se
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className="bg-serbia-blue hover:bg-serbia-blue/90 text-white">
                    <User className="mr-2 h-4 w-4" />
                    Registruj se
                  </Button>
                </SignUpButton>
              </>
            )}
          </div>
        </nav>
      </div>

      {/* Mobile menu dropdown */}
      {isMenuOpen && (
        <div className="bg-white shadow-md md:hidden">
          <div className="px-4 py-6 space-y-6">
            <a href="#" className="block text-sm font-medium text-gray-600 hover:text-serbia-blue">Zahtevi</a>
            <a href="#" className="block text-sm font-medium text-gray-600 hover:text-serbia-blue">Resursi</a>
            <a href="#" className="block text-sm font-medium text-gray-600 hover:text-serbia-blue">Aktuelno</a>
            
            <div className="flex flex-col gap-3 pt-2">
              {isSignedIn ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserButton />
                    <span className="text-sm font-medium text-gray-700">{user?.firstName || 'Korisnik'}</span>
                  </div>
                  <Link to="/user-profile">
                    <Button variant="outline" size="sm" className="border-serbia-blue text-serbia-blue hover:bg-serbia-blue/10">
                      Profil
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <SignInButton mode="modal">
                    <Button variant="outline" className="w-full border-serbia-blue text-serbia-blue hover:bg-serbia-blue/10">
                      <LogIn className="mr-2 h-4 w-4" />
                      Prijavi se
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button className="w-full bg-serbia-blue hover:bg-serbia-blue/90 text-white">
                      <User className="mr-2 h-4 w-4" />
                      Registruj se
                    </Button>
                  </SignUpButton>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
