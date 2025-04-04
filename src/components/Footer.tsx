
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="bg-white border-t">
      <div className="container px-4 py-8 mx-auto md:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold">Građanski Zahtevi</h3>
            <p className="mt-2 text-sm text-gray-500">
              Platforma za demokratsku saradnju i glasanje o zahtevima građana.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Linkovi</h3>
            <ul className="mt-2 space-y-2">
              <li>
                <a href="#" className="text-sm text-gray-500 hover:text-primary">
                  O platformi
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-500 hover:text-primary">
                  Zahtevi
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-500 hover:text-primary">
                  Politika privatnosti
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Kontakt</h3>
            <p className="mt-2 text-sm text-gray-500">
              Imate pitanja ili predloge? Kontaktirajte nas.
            </p>
            <div className="mt-4">
              <Button className="text-sm" variant="outline">
                Kontakt
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-4">
          <p className="text-xs text-center text-gray-500">
            &copy; {new Date().getFullYear()} Građanski Zahtevi. Sva prava zadržana.
          </p>
        </div>
      </div>
    </footer>
  );
}
