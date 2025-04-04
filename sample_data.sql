-- Sample Data for Građanski Zahtevi
-- This script will insert sample data into the database

-- Categories
INSERT INTO public.categories (id, title, short_title, description, slug, icon) VALUES
('education', 'Obrazovanje', 'Obrazovanje', 'Obrazovanje, nauka, kultura i omladinska politika', 'obrazovanje', 'https://img.icons8.com/ios/50/graduation-cap--v1.png'),
('health', 'Zdravstvo', 'Zdravstvo', 'Zdravstvo, socijalna zaštita i demografija', 'zdravstvo', 'https://img.icons8.com/ios/50/heart-health.png'),
('economy', 'Ekonomija', 'Ekonomija', 'Ekonomija, finansije i javna uprava', 'ekonomija', 'https://img.icons8.com/ios/50/money-bag.png'),
('environment', 'Ekologija', 'Ekologija', 'Zaštita životne sredine i održivi razvoj', 'ekologija', 'https://img.icons8.com/ios/50/forest.png'),
('infrastructure', 'Infrastruktura', 'Infrastruktura', 'Saobraćaj, energetika i građevinarstvo', 'infrastruktura', 'https://img.icons8.com/ios/50/bridge.png'),
('justice', 'Pravosuđe', 'Pravosuđe', 'Pravosuđe, ljudska prava i bezbednost', 'pravosude', 'https://img.icons8.com/ios/50/scales.png');

-- Resources
INSERT INTO public.resources (category_id, title, url) VALUES
('education', 'Ministarstvo prosvete', 'https://mpn.gov.rs/'),
('education', 'Zakon o obrazovanju', 'https://www.paragraf.rs/propisi/zakon_o_osnovama_sistema_obrazovanja_i_vaspitanja.html'),
('health', 'Ministarstvo zdravlja', 'https://www.zdravlje.gov.rs/'),
('health', 'Zakon o zdravstvenoj zaštiti', 'https://www.paragraf.rs/propisi/zakon_o_zdravstvenoj_zastiti.html'),
('economy', 'Ministarstvo finansija', 'https://www.mfin.gov.rs/'),
('environment', 'Ministarstvo zaštite životne sredine', 'https://www.ekologija.gov.rs/'),
('infrastructure', 'Ministarstvo građevinarstva', 'https://www.mgsi.gov.rs/'),
('justice', 'Ministarstvo pravde', 'https://www.mpravde.gov.rs/');

-- Requests
INSERT INTO public.requests (id, category_id, title, description, slug, type, status, min, max, has_comments, progress, vote_count, comment_count) VALUES
('digital-education', 'education', 'Digitalizacija obrazovnog sistema', 'Uvođenje digitalnih udžbenika i online nastave u sve škole na teritoriji Republike Srbije', 'digitalizacija-obrazovnog-sistema', 'yesno', 'active', NULL, NULL, true, 45, 0, 0),
('medical-equipment', 'health', 'Nabavka nove medicinske opreme', 'Nabavka savremene medicinske opreme za zdravstvene ustanove', 'nabavka-nove-medicinske-opreme', 'yesno', 'active', NULL, NULL, true, 70, 0, 0),
('tax-reform', 'economy', 'Reforma poreskog sistema', 'Predlog za reformu poreskog sistema i smanjenje nameta za mala preduzeća', 'reforma-poreskog-sistema', 'multiple', 'active', NULL, NULL, true, 30, 0, 0),
('recycling-system', 'environment', 'Unapređenje sistema reciklaže', 'Predlog za unapređenje sistema prikupljanja i reciklaže otpada u Srbiji', 'unapredjenje-sistema-reciklaze', 'multiple', 'active', NULL, NULL, true, 20, 0, 0),
('road-infrastructure', 'infrastructure', 'Obnova putne infrastrukture', 'Predlog za obnovu i modernizaciju putne infrastrukture u ruralnim područjima', 'obnova-putne-infrastrukture', 'range', 'active', 1, 10, true, 65, 0, 0),
('judiciary-reform', 'justice', 'Reforma pravosuđa', 'Predlog za reformu pravosudnog sistema i ubrzanje sudskih procesa', 'reforma-pravosudja', 'yesno', 'active', NULL, NULL, true, 40, 0, 0);

-- Options for multiple choice requests
INSERT INTO public.options (request_id, text) VALUES
('tax-reform', 'Smanjenje poreza na dobit'),
('tax-reform', 'Smanjenje PDV-a'),
('tax-reform', 'Uvođenje poreskih olakšica za nova zapošljavanja'),
('tax-reform', 'Pojednostavljenje poreske administracije'),
('recycling-system', 'Uvođenje sistema depozita za ambalažu'),
('recycling-system', 'Izgradnja više reciklažnih centara'),
('recycling-system', 'Edukacija građana o reciklaži'),
('recycling-system', 'Strože kazne za nepropisno odlaganje otpada');

-- Suggested Requests
-- Note: You'll need to insert actual user IDs when you have users in the system
-- INSERT INTO public.suggested_requests (category_id, user_id, title, description) VALUES
-- Commented out until users are available

-- Timeline Events
INSERT INTO public.timeline_events (request_id, date, title, description, source) VALUES
('digital-education', '2023-01-15', 'Pokretanje inicijative', 'Pokrenuta inicijativa za digitalizaciju obrazovnog sistema', 'Ministarstvo prosvete'),
('digital-education', '2023-03-20', 'Javna rasprava', 'Održana javna rasprava o predlogu za digitalizaciju', 'Vlada Republike Srbije'),
('digital-education', '2023-06-10', 'Usvajanje strategije', 'Usvojena strategija za digitalizaciju obrazovnog sistema', 'Službeni glasnik'),
('medical-equipment', '2023-02-05', 'Analiza potreba', 'Sprovedena analiza potreba zdravstvenih ustanova za novom opremom', 'Ministarstvo zdravlja'),
('medical-equipment', '2023-04-15', 'Izdvajanje sredstava', 'Iz budžeta izdvojena sredstva za nabavku nove opreme', 'Ministarstvo finansija'),
('tax-reform', '2023-03-10', 'Inicijalna studija', 'Predstavljena inicijalna studija o reformi poreskog sistema', 'Ministarstvo finansija'),
('recycling-system', '2023-01-20', 'Analiza stanja', 'Sprovedena analiza trenutnog stanja sistema reciklaže', 'Ministarstvo zaštite životne sredine'),
('road-infrastructure', '2023-02-12', 'Mapiranje potreba', 'Mapirane kritične tačke putne infrastrukture', 'Ministarstvo građevinarstva'),
('judiciary-reform', '2023-01-30', 'Pokretanje inicijative', 'Pokrenuta inicijativa za reformu pravosuđa', 'Ministarstvo pravde'); 