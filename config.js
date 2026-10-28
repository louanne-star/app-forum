/* =====================================================================
   FORÇATS'NOU — CONFIGURATION
   C'est le SEUL fichier à modifier pour adapter l'appli au forum.
   ===================================================================== */
window.FORUM_CONFIG = {

  /* ---------- 1. Connexion Supabase ----------
     Laisser vide = MODE DÉMO : tout reste dans le navigateur, pratique
     pour tester l'appli seule mais RIEN n'est partagé entre téléphones.
     Le jour du forum : coller l'URL et la clé "anon public" du projet
     (Supabase > Project Settings > API). */
  supabaseUrl: 'https://kcmjeykhnoffoolgxaeu.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbWpleWtobm9mZm9vbGd4YWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNzA1MzgsImV4cCI6MjEwODY0NjUzOH0.IzWeR5VDmQvvOeHIGErIDQseWL615Sd0EEjiR4yya5o',

  /* ---------- 2. Adresse publique du site ----------
     Sert à générer les QR codes. Mettre l'adresse Netlify, par ex.
     'https://forcats-nou.netlify.app/'. Vide = adresse de la page actuelle. */
  baseUrl: '',

  /* ---------- 3. Code d'accès de l'espace équipe (#/equipe) ---------- */
  codeEquipe: '1864',

  /* ---------- 4. Nombre minimum d'activités pour terminer le parcours ---------- */
  minActivites: 3,

  /* ---------- 5. Message affiché quand le visiteur termine ---------- */
  messageFin: "Sors par la porte arrière du stand : l'équipe t'y remet ta carte matricule.",

  /* ---------- 6. Phrase de consentement (case à cocher à l'inscription) ---------- */
  consentement: "J'accepte que ma photo et mon nom servent uniquement à imprimer ma carte matricule. Ils seront supprimés après le forum.",

  /* ---------- 7. Les niveaux (selon le nombre d'activités faites) ----------
     min         : nombre d'activités validées pour atteindre ce niveau
     titre       : le niveau en clair, en mots d'époque (apprenti, compagnon, maître)
     nom         : le grade au bagne
     description : petit texte affiché au visiteur à la fin
     Le visiteur reçoit le niveau le plus haut qu'il a atteint.
     ⚠ Ajuster les "min" quand la vraie liste d'activités est connue. */
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

  /* ---------- 8. Les activités du stand ----------
     id          : identifiant court, sans espace ni accent (il est dans le QR code)
     nom         : nom affiché
     format      : 'Papier', 'Numérique' ou 'Réalité virtuelle' (pour l'équipe, pas affiché aux visiteurs)
     jeu         : (numérique) page du jeu, ouverte sur les tablettes du stand (#/tablette).
     lien        : (réalité virtuelle) site externe, proposé lui aussi dans #/tablette.
     description : l'explication donnée au visiteur dans la liste des activités
     Chaque activité a son QR code (#/equipe/qr) : le visiteur le scanne
     quand il a fini l'activité, pour la valider.
     ⚠ Ne pas changer l'id d'une activité après avoir imprimé ses QR codes. */
  activites: [
    {
      id: 'decouverte',
      nom: 'La découverte inversée',
      format: 'Papier',
      description: "Déchiffre les rébus des cartes et retrouve chaque lieu sur la carte."
    },
    {
      id: 'evasion',
      nom: "L'Évasion",
      format: 'Numérique',
      jeu: 'jeux/evasion/index.html',
      description: "Choisis ton histoire de forçat, puis fais 5 choix pour préparer et réussir ta fuite. Un faux pas et tu es repris !"
    },
    {
      id: 'guillotine',
      nom: 'Le Pendu du Bagne',
      format: 'Numérique',
      jeu: 'jeux/guillotine/index.html',
      description: "Trouve 10 mots du bagne, lettre par lettre, avant que la lame de la guillotine ne tombe."
    },
    {
      id: 'avant-apres',
      nom: 'Avant / après',
      format: 'Numérique',
      jeu: 'jeux/avant-apres/index.html',
      description: "10 lieux du bagne, hier et aujourd'hui : qu'est-ce qui a changé ?"
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
      id: '4-images',
      nom: 'Bout à bout',
      format: 'Numérique',
      jeu: 'jeux/4-images/index.html',
      description: "Quatre images, un seul mot : trouve ce qu'elles ont en commun."
    },
    {
      id: 'argot',
      nom: 'Les Mots du Bagne',
      format: 'Numérique',
      jeu: 'jeux/argot/index.html',
      description: "Carabousse, chiourme, doublage… retrouve le vrai sens de 10 mots du bagne."
    },
    {
      /* Sur le casque : ouvrir #/tablette dans le navigateur du casque et choisir
         cette activité (ou aller directement sur le lien). */
      id: 'vr',
      nom: "L'île Nou en réalité virtuelle",
      format: 'Réalité virtuelle',
      lien: 'https://vr-forum.netlify.app',
      description: "Enfilez le casque et plongez dans le bagne de l’île Nou : choisissez un lieu sur la carte d’époque, puis explorez une salle d’exposition virtuelle avec photos d’archives, récits et ambiance sonore."
    }
  ]
};
