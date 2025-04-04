
export const categories = [
  {
    id: "media",
    title: "Mediji",
    shortTitle: "Mediji",
    description: "Zahtevi vezani za medije i slobodu informisanja",
    count: 2,
    resources: [
      { title: "Izveštaj o medijskim slobodama", url: "#" },
      { title: "Analiza REM regulativa", url: "#" }
    ]
  },
  {
    id: "elections",
    title: "Izborni uslovi",
    shortTitle: "Izbori",
    description: "Zahtevi za unapređenje i čišćenje biračkih spiskova",
    count: 1,
    resources: [
      { title: "Izborni zakoni", url: "#" },
      { title: "Birački spiskovi - analiza", url: "#" }
    ]
  },
  {
    id: "security",
    title: "Službe Bezbednosti",
    shortTitle: "Bezbednost",
    description: "Zahtevi vezani za reforme službi bezbednosti",
    count: 1,
    resources: [
      { title: "Zakon o službama bezbednosti", url: "#" },
      { title: "Reforma BIA - predlozi", url: "#" }
    ]
  },
  {
    id: "judiciary",
    title: "Pravosuđe",
    shortTitle: "Pravosuđe",
    description: "Zahtevi za reformu pravosuđa",
    count: 1,
    resources: [
      { title: "Status pravosuđa u Srbiji", url: "#" },
      { title: "Nezavisnost tužilaštva", url: "#" }
    ]
  },
  {
    id: "government",
    title: "Prelazna Vlada i Opozicija",
    shortTitle: "Vlada",
    description: "Predlozi za formiranje prelazne vlade i opoziciono delovanje",
    count: 4,
    resources: [
      { title: "Modeli tehničke vlade", url: "#" },
      { title: "Primeri prelaznih vlada u regionu", url: "#" },
      { title: "Analiza opozicionih lista", url: "#" }
    ]
  }
];

export const requests = [
  {
    id: "rts",
    categoryId: "media",
    title: "Smena čelnika RTS",
    description: "Glasanje o zahtevu za smenu rukovodstva Radio-televizije Srbije",
    type: "yesno",
    initialVotes: { "yes": 125, "no": 15 },
    hasComments: true
  },
  {
    id: "rem",
    categoryId: "media",
    title: "Smena čelnika REM",
    description: "Glasanje o zahtevu za smenu rukovodstva Regulatornog tela za elektronske medije",
    type: "yesno",
    initialVotes: { "yes": 142, "no": 9 },
    hasComments: true
  },
  {
    id: "voter-lists",
    categoryId: "elections",
    title: "Čišćenje biračkih spiskova",
    description: "Podržavamo zahtev za čišćenje biračkih spiskova i poboljšanje izbornih uslova",
    type: "yesno",
    initialVotes: { "yes": 178, "no": 3 },
    hasComments: true
  },
  {
    id: "bia",
    categoryId: "security",
    title: "Smena čelnika BIA",
    description: "Glasanje o zahtevu za smenu rukovodstva Bezbednosno-informativne agencije",
    type: "yesno",
    initialVotes: { "yes": 132, "no": 22 },
    hasComments: true
  },
  {
    id: "zagorka",
    categoryId: "judiciary",
    title: "Smena Zagorke Dolovac",
    description: "Glasanje o zahtevu za smenu javnog tužioca",
    type: "yesno",
    initialVotes: { "yes": 156, "no": 11 },
    hasComments: true
  },
  {
    id: "transition-gov",
    categoryId: "government",
    title: "Prelazna/Ekspertska/Tehnička Vlada",
    description: "Podržavamo prelaznu/ekspertsku/tehničku vladu pred slobodne izbore",
    type: "yesno",
    initialVotes: { "yes": 143, "no": 28 },
    hasComments: true
  },
  {
    id: "transition-period",
    categoryId: "government",
    title: "Termin trajanja pred slobodne izbore",
    description: "Glasanje o optimalnom trajanju prelazne vlade pre slobodnih izbora",
    type: "range",
    min: 3,
    max: 18,
    hasComments: true
  },
  {
    id: "transition-composition",
    categoryId: "government",
    title: "Sastav prelazne vlade",
    description: "Koji sastav prelazne vlade bi bio optimalan pred slobodne izbore",
    type: "multiple",
    options: [
      "Ekspertska izabrana od strane studenata", 
      "Prelazna, opozicija + nestranačka lica i eksperti", 
      "Prelazna, zajedno sa SNS"
    ],
    initialVotes: { 
      "Ekspertska izabrana od strane studenata": 42, 
      "Prelazna, opozicija + nestranačka lica i eksperti": 87, 
      "Prelazna, zajedno sa SNS": 13
    },
    hasComments: true
  },
  {
    id: "opposition-list",
    categoryId: "government",
    title: "Sastav opozicione liste za slobodne izbore",
    description: "Kako bi opozicione liste trebale da se organizuju za izbore",
    type: "multiple",
    options: [
      "Jedna lista: svi zajedno", 
      "Dve liste: jedna levica, jedna desnica"
    ],
    initialVotes: { 
      "Jedna lista: svi zajedno": 65, 
      "Dve liste: jedna levica, jedna desnica": 89
    },
    hasComments: true
  }
];

export const mockComments = [
  {
    id: "comment1",
    author: {
      name: "Milan Petrović",
      initials: "MP"
    },
    content: "Mislim da je smena čelnika RTS-a apsolutno neophodna da bi se osigurala objektivna i profesionalna informisanost građana. Trenutno rukovodstvo ne pokazuje nezavisnost u izveštavanju.",
    timestamp: "Pre 2 dana",
    votes: 28,
    replies: [
      {
        id: "reply1",
        author: {
          name: "Ana Jovanović",
          initials: "AJ"
        },
        content: "Slažem se, ali ne treba zaboraviti da promene moraju biti sistemske, a ne samo kadrovske.",
        timestamp: "Pre 1 dan",
        votes: 15,
        replies: []
      }
    ]
  },
  {
    id: "comment2",
    author: {
      name: "Nikola Đorđević",
      initials: "NĐ"
    },
    content: "Zagorka Dolovac godinama ne reaguje na sistemske probleme u pravosuđu. Njena smena je samo prvi korak ka reformi tužilaštva i pravosuđa uopšte. Moramo da uspostavimo nezavisnost sudstva i tužilaštva od političkog uticaja ako želimo da imamo vladavinu prava.",
    timestamp: "Pre 3 dana",
    votes: 42,
    replies: []
  }
];
