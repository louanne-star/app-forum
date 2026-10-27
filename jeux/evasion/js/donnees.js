/* ==========================================================
   L'Évasion — données annexes
   - ATOUTS    : nom et icône de chaque atout (affichés dans le sac)
   - GLOSSAIRE : mots difficiles, soulignés dans les textes ;
                 un appui sur le mot affiche sa définition
   ========================================================== */

/* nom : avec article, pour les phrases (« Il te fallait la corde. ») */
const ATOUTS = {
  corde:    { icone: "🪢", court: "Corde",     nom: "la corde" },
  vivres:   { icone: "🍞", court: "Pain sec",  nom: "le pain sec" },
  complice: { icone: "🤝", court: "Complice",  nom: "un complice" },
  outre:    { icone: "🛟", court: "Outre",     nom: "l'outre en cuir" },
  uniforme: { icone: "🧥", court: "Uniforme",  nom: "l'uniforme de surveillant" },
  nuit:     { icone: "🌑", court: "Nuit noire", nom: "une nuit sans lune" },
  burin:    { icone: "🔨", court: "Burin",     nom: "le burin" },
  pecheur:  { icone: "🎣", court: "Pêcheur",   nom: "l'aide du pêcheur" }
};

/* formes : les façons dont le mot apparaît dans les textes
   (la recherche ignore les majuscules) */
const GLOSSAIRE = [
  { formes: ["bagne"], mot: "Bagne",
    def: "Prison de travaux forcés, loin de chez soi. En Nouvelle-Calédonie de 1864 à 1897." },
  { formes: ["forçat", "forçats"], mot: "Forçat",
    def: "Prisonnier condamné aux travaux forcés." },
  { formes: ["matricule"], mot: "Matricule",
    def: "Numéro qui remplace le nom du forçat." },
  { formes: ["paillasse"], mot: "Paillasse",
    def: "Matelas rempli de paille." },
  { formes: ["briqueterie"], mot: "Briqueterie",
    def: "Atelier où l'on fait des briques." },
  { formes: ["pierre mauve"], mot: "Pierre mauve",
    def: "Pierre violette qui a servi à bâtir le bagne." },
  { formes: ["carrière"], mot: "Carrière",
    def: "Endroit où l'on extrait de la pierre." },
  { formes: ["burin"], mot: "Burin",
    def: "Outil en acier pour tailler la pierre." },
  { formes: ["outre"], mot: "Outre",
    def: "Sac en cuir étanche. Gonflé d'air, il flotte." },
  { formes: ["chaloupe"], mot: "Chaloupe",
    def: "Grande barque qui va de la côte aux navires." },
  { formes: ["enceinte"], mot: "Enceinte",
    def: "Les murs qui entourent le camp." },
  { formes: ["étable"], mot: "Étable",
    def: "Bâtiment où vivent les vaches." },
  { formes: ["aube"], mot: "Aube",
    def: "Le tout début du jour." },
  { formes: ["sentinelle"], mot: "Sentinelle",
    def: "Gardien qui surveille un endroit." },
  { formes: ["ronde"], mot: "Ronde",
    def: "Tour de surveillance des gardiens, la nuit." },
  { formes: ["patrouille"], mot: "Patrouille",
    def: "Groupe de gardiens qui cherche les évadés." },
  { formes: ["fers"], mot: "Les fers",
    def: "Chaînes attachées aux pieds d'un prisonnier." },
  { formes: ["communards"], mot: "Communards",
    def: "Révoltés de la Commune de Paris (1871). Beaucoup ont été envoyés en Nouvelle-Calédonie." },
  { formes: ["Queensland"], mot: "Queensland",
    def: "Région du nord-est de l'Australie, la plus proche de la Nouvelle-Calédonie." }
];
