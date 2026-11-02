/* Réglages de l'appli : Supabase, code équipe, niveaux et activités */
window.FORUM_CONFIG = {

  /* Supabase (vide = mode démo, tout reste dans le navigateur) */
  supabaseUrl: 'https://kcmjeykhnoffoolgxaeu.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbWpleWtobm9mZm9vbGd4YWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNzA1MzgsImV4cCI6MjEwODY0NjUzOH0.IzWeR5VDmQvvOeHIGErIDQseWL615Sd0EEjiR4yya5o',

  /* Adresse du site pour les QR codes (vide = adresse actuelle) */
  baseUrl: '',

  /* Code de l'espace équipe et des tablettes */
  codeEquipe: '1864',

  /* Nombre d'activités minimum pour finir */
  minActivites: 3,

  /* Message de fin */
  messageFin: "Sors par la porte arrière du stand : l'équipe t'y remet ta carte matricule.",

  /* Case à cocher à l'inscription */
  consentement: "J'accepte que ma photo et mon nom servent uniquement à imprimer ma carte matricule. Ils seront supprimés après le forum.",

  /* Niveaux : min = nombre d'activités à faire pour l'avoir */
  niveaux: [
    {
      id: 'classe3',
      min: 3,
      titre: 'Apprenti',
      nom: 'Forçat de 3e classe',
      description: "Tout juste débarqué à l'île Nou, tu découvres la vie du bagne. Les surveillants t'ont à l'œil : encore un peu d'expérience et tu monteras en classe."
    },
    {
      id: 'classe2',
      min: 6,
      titre: 'Compagnon',
      nom: 'Forçat de 2e classe',
      description: "Tu connais les chantiers, les règles et les recoins du pénitencier. Ta bonne conduite commence à se remarquer."
    },
    {
      id: 'classe1',
      min: 9,
      titre: 'Maître',
      nom: 'Forçat de 1re classe',
      description: "Plus rien du bagne n'a de secret pour toi. Les forçats de 1re classe avaient droit à des faveurs : tu les as bien méritées."
    }
  ],

  /* Activités du stand, dans l'ordre du parcours.
     L'id est dans le QR code : ne plus le changer après l'impression ! */
  activites: [
    {
      id: 'avant-apres',
      nom: "Avant / Aujourd'hui",
      format: 'Numérique',
      jeu: 'jeux/slide avant apres/index.html',
      description: "Fais glisser la barre sur 8 photos d'époque et découvre les bâtiments du bagne tels qu'ils sont aujourd'hui."
    },
    {
      id: 'argot',
      nom: 'Les Mots du Bagne',
      format: 'Numérique',
      jeu: 'jeux/argot/index.html',
      description: "Carabousse, chiourme, doublage… retrouve le vrai sens de 10 mots du bagne."
    },
    {
      id: 'decouverte',
      nom: 'La découverte inversée',
      format: 'Papier',
      description: "Déchiffre les rébus des cartes et retrouve chaque lieu sur la carte."
    },
    {
      id: 'memory-sonore',
      nom: 'Le memory sonore',
      format: 'Numérique',
      jeu: 'jeux/memory-sonore/index.html',
      description: "Cloche, vagues, travaux… associe chaque son d'époque au bon lieu."
    },
    {
      id: 'zoom',
      nom: 'Plein cadre',
      format: 'Numérique',
      jeu: 'jeux/zoom/index.html',
      description: "Un détail en gros plan : devine ce que c'est. Plus tu trouves vite, plus tu marques de points."
    },
    {
      id: 'evasion',
      nom: "L'Évasion",
      format: 'Numérique',
      jeu: 'jeux/evasion/index.html',
      description: "Choisis ton histoire de forçat, puis fais 5 choix pour préparer et réussir ta fuite. Un faux pas et tu es repris !"
    },
    {
      id: 'tri-objets',
      nom: 'Inventaire',
      format: 'Numérique',
      jeu: 'jeux/tri-objets/index.html',
      description: "Pain, briques, chaux… glisse chaque objet dans la caisse du lieu du bagne où il était fabriqué."
    },
    {
      id: 'anachronisme',
      nom: "Cherche l'anachronisme",
      format: 'Papier',
      description: "Dans la grande scène dessinée, repère l'objet qui n'existait pas à l'époque."
    },
    {
      id: '4-images',
      nom: 'Bout à bout',
      format: 'Numérique',
      jeu: 'jeux/4-images/index.html',
      description: "Quatre images, un seul mot : trouve ce qu'elles ont en commun."
    },
    {
      id: 'guillotine',
      nom: 'Le Pendu du Bagne',
      format: 'Numérique',
      jeu: 'jeux/guillotine/index.html',
      description: "Trouve 10 mots du bagne, lettre par lettre, avant que la lame de la guillotine ne tombe."
    },
    {
      /* Sur le casque on ouvre directement le lien */
      id: 'vr',
      nom: "L'île Nou en réalité virtuelle",
      format: 'Réalité virtuelle',
      lien: 'https://vr-forum.netlify.app',
      description: "Enfilez le casque et plongez dans le bagne de l’île Nou : choisissez un lieu sur la carte d’époque, puis explorez une salle d’exposition virtuelle avec photos d’archives, récits et ambiance sonore."
    }
  ]
};
