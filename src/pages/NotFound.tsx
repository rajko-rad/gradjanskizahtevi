
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow flex items-center justify-center py-12 px-4">
        <div className="text-center max-w-md">
          <h1 className="text-6xl font-bold text-serbia-blue mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-6">
            Stranica koju tražite ne postoji
          </p>
          <Button asChild>
            <a href="/">Povratak na početnu</a>
          </Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default NotFound;
