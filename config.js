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

  /* ---------- 4. Nombre minimum d'activités pour obtenir son verdict ---------- */
  minActivites: 3,

  /* ---------- 5. Les rôles (un autocollant par rôle) ----------
     id          : identifiant court, sans espace ni accent
     nom         : ce qui s'affiche
     description : petit texte affiché au visiteur avec son verdict
     autocollant : repère pour l'équipe à la sortie (couleur, n°…)
     En cas d'égalité de points, le rôle placé le plus HAUT gagne.
     ⚠ EXEMPLES À REMPLACER */
  roles: [
    {
      id: 'transporte',
      nom: 'Forçat transporté',
      description: "Condamné aux travaux forcés, tu as fait la traversée jusqu'à l'île Nou. Tes journées se passent aux chantiers, sous le regard des surveillants.",
      autocollant: 'Autocollant n°1'
    },
    {
      id: 'surveillant',
      nom: 'Surveillant militaire',
      description: "Tu fais respecter le règlement du pénitencier. Rondes, appels, registres : rien ne t'échappe.",
      autocollant: 'Autocollant n°2'
    },
    {
      id: 'medecin',
      nom: 'Médecin de marine',
      description: "Tu soignes les malades et les blessés du bagne à l'infirmerie, avec les moyens du bord.",
      autocollant: 'Autocollant n°3'
    },
    {
      id: 'libere',
      nom: 'Libéré concessionnaire',
      description: "Ta peine est purgée. On t'a attribué une concession de terre : à toi de la faire vivre.",
      autocollant: 'Autocollant n°4'
    }
  ],

  /* ---------- 6. Les activités de la salle ----------
     id          : identifiant court, sans espace ni accent (il est dans le QR code)
     nom         : nom affiché
     description : l'explication donnée au visiteur quand il scanne
     points      : combien de points l'activité donne à chaque rôle
     ⚠ Ne pas changer l'id d'une activité après avoir imprimé ses QR codes.
     ⚠ EXEMPLES À REMPLACER */
  activites: [
    {
      id: 'tribunal',
      nom: 'Le tribunal du bagne',
      description: "Juge les dossiers de détenus et choisis la bonne peine.",
      points: { surveillant: 2, transporte: 1 }
    },
    {
      id: 'atelier',
      nom: "L'atelier",
      description: "Découvre les métiers que les forçats exerçaient sur les chantiers de l'île.",
      points: { transporte: 2, libere: 1 }
    },
    {
      id: 'infirmerie',
      nom: "L'infirmerie",
      description: "Retrouve les remèdes et les gestes de l'époque.",
      points: { medecin: 3 }
    },
    {
      id: 'registre',
      nom: 'Le registre matricule',
      description: "Fouille les registres et retrouve la fiche d'un détenu.",
      points: { surveillant: 2, medecin: 1 }
    },
    {
      id: 'concession',
      nom: 'La concession',
      description: "Imagine la vie d'un libéré sur sa terre, après la peine.",
      points: { libere: 3 }
    }
  ]
};
