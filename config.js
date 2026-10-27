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
  supabaseUrl: '',
  supabaseAnonKey: '',

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
     titre       : le niveau en clair (débutant, intermédiaire…)
     nom         : le grade au bagne
     description : petit texte affiché au visiteur à la fin
     Le visiteur reçoit le niveau le plus haut qu'il a atteint.
     ⚠ Ajuster les "min" quand la vraie liste d'activités est connue. */
  niveaux: [
    {
      id: 'classe3',
      min: 3,
      titre: 'Débutant',
      nom: 'Forçat de 3e classe',
      description: "Tout juste débarqué à l'île Nou, tu découvres la vie du bagne. Les surveillants t'ont à l'œil : encore un peu d'expérience et tu monteras en classe."
    },
    {
      id: 'classe2',
      min: 4,
      titre: 'Intermédiaire',
      nom: 'Forçat de 2e classe',
      description: "Tu connais les chantiers, les règles et les recoins du pénitencier. Ta bonne conduite commence à se remarquer."
    },
    {
      id: 'classe1',
      min: 5,
      titre: 'Maîtrise',
      nom: 'Forçat de 1re classe',
      description: "Plus rien du bagne n'a de secret pour toi. Les forçats de 1re classe avaient droit à des faveurs : tu les as bien méritées."
    }
  ],

  /* ---------- 8. Les activités du stand ----------
     id          : identifiant court, sans espace ni accent (il est dans le QR code)
     nom         : nom affiché
     description : l'explication donnée au visiteur dans la liste des activités
     ⚠ Ne pas changer l'id d'une activité après avoir imprimé ses QR codes.
     ⚠ EXEMPLES À REMPLACER */
  activites: [
    {
      id: 'tribunal',
      nom: 'Le tribunal du bagne',
      description: "Juge les dossiers de détenus et choisis la bonne peine."
    },
    {
      id: 'atelier',
      nom: "L'atelier",
      description: "Découvre les métiers que les forçats exerçaient sur les chantiers de l'île."
    },
    {
      id: 'infirmerie',
      nom: "L'infirmerie",
      description: "Retrouve les remèdes et les gestes de l'époque."
    },
    {
      id: 'registre',
      nom: 'Le registre matricule',
      description: "Fouille les registres et retrouve la fiche d'un détenu."
    },
    {
      id: 'concession',
      nom: 'La concession',
      description: "Imagine la vie d'un libéré sur sa terre, après la peine."
    }
  ]
};
