# Forçats'Nou — appli du forum

Le visiteur s'inscrit à l'entrée (prénom, nom, matricule de 4 chiffres, photo d'identité). L'équipe reçoit sa fiche en direct, dans l'ordre d'arrivée, et imprime sa carte matricule sur Canva. Pendant la visite, l'appli sert de guide : liste des activités, bouton « Scanner » pour valider chaque activité. Le visiteur fait les activités qu'il veut (au moins 3), termine son parcours, découvre son niveau au bagne et sort par la porte arrière récupérer sa carte.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `config.js` | **Le seul fichier à modifier** : Supabase, activités, niveaux, message de fin, code équipe |
| `index.html`, `app.js`, `styles.css` | L'appli (pas besoin d'y toucher) |
| `supabase.sql` | Script qui crée la base et le stockage des photos |

## Tester tout de suite (mode démo)

Ouvrir `index.html` via un petit serveur local (par ex. l'extension *Live Server* de VS Code). Sans Supabase, l'appli tourne en **mode démo** : les données restent dans le navigateur. Ouvre deux onglets (un visiteur, un `#/equipe`) pour voir la synchro.

⚠ Le scanner intégré a besoin de la caméra, donc d'une adresse en **https** : il marche sur le site Netlify, pas forcément en local sur un téléphone.

## Mise en place pour le forum

1. **Supabase** : créer un projet → *SQL Editor* → coller `supabase.sql` → *Run* (crée les tables et le dossier `photos`).
2. **config.js** : coller `supabaseUrl` et `supabaseAnonKey` (*Project Settings → API*, clé `anon public`).
3. **Netlify** : glisser le dossier sur app.netlify.com/drop. Mettre l'adresse obtenue dans `baseUrl` (config.js) puis redéployer.
4. **Activités** : remplacer les exemples dans `config.js` (nom + description).
5. **Niveaux** : ajuster les `min` des 3 niveaux (Apprenti, Compagnon, Maître) selon le nombre réel d'activités.
6. **QR codes** : ouvrir `<adresse>/#/equipe/qr` et imprimer la page (Ctrl/Cmd + P). Un QR pour l'entrée, un par activité.

⚠ Ne change plus l'`id` d'une activité une fois ses QR codes imprimés.

## Le jour J

- **Espace équipe** (sur l'ordi d'impression) : `<adresse>/#/equipe`, code dans `config.js` (`codeEquipe`).
  - Chaque inscription arrive en direct avec un petit son (clique une fois dans la page pour l'activer). La plus ancienne est en premier.
  - Chaque fiche montre la **carte matricule déjà remplie** (photo, NOM, prénom, matricule) sur le modèle Canva.
  - **Planche** (A4 épaisse, recto verso automatique, Epson ET-15000) : les cartes sont posées **en bande de 2 en haut de la feuille** (plus de bandes si on choisit plus de cartes, jusqu'à 10).
    1. **Imprimer recto verso** : une seule impression de 2 pages (page 1 = recto, page 2 = verso). Dans la fenêtre d'impression : **recto verso, retournement bord long**, échelle **100 %**, marges « aucune », sans en-têtes ni pieds de page. Les cartes sont aussitôt marquées imprimées et la planche suivante se prépare.
    2. **Couper droit** sous les cartes (traits dans les marges) et séparer les cartes.
    3. Remettre **le reste de la feuille** dans l'imprimante, **bord coupé en haut**, pour la bande suivante.
  - Impression ratée ? Sur la fiche du visiteur (« Voir aussi les imprimées ») : **« Imprimée · remettre dans la file »**.
  - La file met en premier les visiteurs qui ont **terminé** leur parcours (on les attend à la porte), puis l'ordre d'arrivée. Le menu « Cartes sur la feuille » choisit combien en imprimer (2 par défaut).
  - **Avant le forum : faire des tests sur papier normal** : vérifier que recto et verso se superposent (regarder la feuille à la lumière), puis que l'imprimante accepte encore la feuille raccourcie en recto verso après 1, 2, 3 bandes coupées.
  - Secours : **Télécharger la carte** (PNG) pour l'imprimer depuis un autre logiciel.
- **Tablettes du stand** : `<adresse>/#/tablette` (même code équipe, la tablette s'en souvient). On choisit le jeu, il s'ouvre en plein écran (sans barre du navigateur sur Android et iPad ; sur iPhone, ou si la barre revient, ajouter la page `#/tablette` à l'écran d'accueil avec Partager → « Sur l'écran d'accueil » et l'ouvrir depuis l'icône). Les visiteurs ne voient jamais les jeux sur leur téléphone.
  - Fin de partie : l'équipe montre au visiteur le **QR imprimé** de l'activité (page `#/equipe/qr`, un par activité, papier comme numérique). Il le scanne avec « Scanner » de son appli → activité validée.
  - **« Visiteur suivant »** (deux appuis) relance le jeu à zéro. L'Évasion repart aussi avec 0 fin découverte. Le bouton ☰ permet de changer de jeu.
  - Chaque jeu numérique vit dans `jeux/<id>/index.html` (chemin `jeu` dans config.js).
- **Casque VR** : ouvrir https://vr-forum.netlify.app dans le navigateur du casque (le lien est aussi dans la liste de `#/tablette`, champ `lien` dans config.js). Validation comme les autres : le QR imprimé de l'activité.
- **Modèle de carte** : le fond est `carte/recto.png` (modèle Canva sans le texte ni la photo). Le verso (`carte/verso.png`) est le même pour tous : il est imprimé automatiquement en page 2.
  - Chaque fiche indique si le visiteur est encore en visite ou a terminé (et son niveau).
- **Visiteur qui change de téléphone** : lien « J'ai déjà un dossier » (matricule + nom).
- **Matricule déjà pris** : l'appli demande au visiteur d'en choisir un autre.
- **Caméra refusée** : le visiteur peut aussi scanner le QR d'une activité avec l'appareil photo de son téléphone, ça valide pareil.

## Après le forum

- Vider les données : dernière ligne de `supabase.sql` (`truncate …`).
- Supprimer les photos : Supabase → *Storage* → `photos` → tout sélectionner → *Delete*.

C'est promis aux visiteurs dans la phrase de consentement : à faire juste après l'événement.

## Sécurité, en clair

Le code équipe protège l'écran, pas la base : quelqu'un de très motivé pourrait lire la liste des noms et des photos avec la clé publique. C'est acceptable pour une journée de forum, à condition de tout supprimer ensuite.
