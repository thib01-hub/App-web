# SportPerf — suivi des performances sportives

## Vision du projet

SportPerf est une application web multisport destinée à plusieurs utilisateurs. Chaque personne crée un compte et suit ses propres performances. Les données d’un compte ne sont pas publiques ni partagées avec les autres utilisateurs.

Les sports prévus sont le tennis, le badminton, le tennis de table, le padel, le squash, le cyclisme et la course à pied. Le tennis est le premier sport développé. La prochaine extension porte sur les sports de raquette ; le cyclisme et la course à pied seront développés plus tard. Les données sont saisies manuellement ; aucune connexion à une montre ou à un service sportif n’est prévue.

L’application est d’abord optimisée pour ordinateur et doit rester ergonomique.

## Architecture technique

```text
Navigateur : React, fichiers préparés par Vite
                  │ HTTP, même origine en production
                  ▼
          app : Node.js / Express
                  │ SQL paramétré avec pg
                  ▼
          db : PostgreSQL + volume persistant
```

## Périmètre du MVP tennis

### Comptes et confidentialité

- Un visiteur peut créer un compte et se connecter.
- Un utilisateur peut consulter, créer, modifier et supprimer ses matchs et rendez-vous.
- Chaque compte ne peut accéder qu’à ses propres données.
- L’interface prend en charge l’inscription, la connexion, la déconnexion et l’absence de données.

### Enregistrer un match joué

L’action principale est **« Enregistrer un match »**. Un match comprend :

- sa catégorie : match amical, match de tournoi ou entraînement à score personnalisé ;
- son format : simple ou double ;
- sa date, son lieu et sa surface ;
- le tour du tournoi, si le match fait partie d’un tournoi ;
- le format de score : format officiel prédéfini pour un match, ou saisie libre pour un entraînement ;
- le score de chaque set, exprimé en jeux, avec identification d’un super tie-break ;
- sa durée en minutes ;
- le ressenti du sportif sur une échelle de 1 à 10.

En simple, les noms, prénoms et classements des deux joueurs sont enregistrés. En double, ces informations sont enregistrées pour les quatre participants, répartis en deux équipes, et l’équipe de l’utilisateur est identifiée.

Le classement FFT de chaque participant est saisi manuellement au moment du match. `NC` est une valeur possible. Les classements sont comparés selon leur ordre sportif, et non comme du texte. L’ordre retenu va de `NC` (moins bien classé) à `-30` (mieux classé).

Pour un match au format officiel, le score contient les jeux de chaque set, sans le détail des points. Un super tie-break est saisi en points et identifié comme tel. Exemple :

```text
Jean vs Arnaud
6-4
5-7
10-8 (super tie-break)
```

L’utilisateur peut consulter, modifier et supprimer les matchs enregistrés.

### Historique et statistiques

L’historique présente la date, le résultat, l’adversaire ou les joueurs concernés, le score et le contexte du match.

Les statistiques de simple et de double utilisent les mêmes indicateurs, calculés et présentés séparément. Seuls les matchs saisis selon un format officiel sont pris en compte ; les scores personnalisés d’entraînement sont exclus :

- nombre de matchs joués, de victoires et de défaites ;
- ratio de victoires (victoires divisées par matchs joués) ;
- meilleure victoire : match gagné contre l’adversaire au meilleur classement FFT affronté ;
- nombre de matchs joués par mois ;
- taux de victoire contre des adversaires mieux classés et contre des adversaires moins bien classés.

En double, les taux contre des équipes mieux ou moins bien classées reposent sur la moyenne des rangs numériques des deux équipes. Les matchs sans classement complet sont exclus de ces taux. Le tableau de bord indique lorsqu’un indicateur n’est pas calculable, par exemple faute de matchs ou de classements exploitables.

### Planifier un match

Un rendez-vous à venir comprend la date, l’heure, le lieu, le nom de l’adversaire et son classement éventuel. Il est présenté sous forme de carte récapitulative et peut être modifié ou supprimé.

La planification est un aide-mémoire personnel : elle n’envoie ni invitation ni notification. Un rendez-vous ne devient pas automatiquement un match joué ; l’utilisateur saisit le résultat séparément dans l’historique.

### Ergonomie

- L’interface s’organise autour du tableau de bord, de l’historique, de l’enregistrement des matchs et de la planification.
- Les formulaires guident la saisie et présentent clairement les erreurs.
- Les statistiques de simple et de double ne sont jamais agrégées.

## État actuel de l’application

Le dépôt contient une application React/Vite, un serveur Node.js/Express et PostgreSQL avec un volume Docker persistant. L’inscription, la connexion, les sessions, les matchs, les rendez-vous et les requêtes de données sont gérés côté serveur. Les matchs et rendez-vous sont isolés par compte.

L’interface porte désormais le nom **SportPerf**. Elle comprend un tableau de bord tennis, l’historique, les statistiques simples/doubles, les rendez-vous et un bandeau de navigation à droite pour les sept sports prévus. Les écrans des sports sans règles définies n’affichent aucune performance inventée.

La saisie tennis distingue les matchs amicaux, les tournois et les entraînements à score libre. Les quatre formats officiels sont sélectionnables ; les scores de sets classiques et de super tie-break sont validés séparément par le serveur. Les entraînements sont conservés dans l’historique, modifiables et supprimables, mais exclus des statistiques officielles.

Au démarrage, le serveur applique une migration SQL idempotente qui conserve les lignes existantes, convertit les identifiants de formats et prépare les noms/prénoms des joueurs. La connexion PostgreSQL reste fournie par `DATABASE_URL` côté serveur.

## Évolutions souhaitées

### Identité SportPerf et accès multisports

- Utiliser **SportPerf** comme nom et identité de l’application, notamment sur les pages de connexion et dans la navigation. **Réalisé.**
- Afficher à droite du tableau de bord un bandeau de navigation avec les sports : tennis, badminton, tennis de table, padel, squash, cyclisme et course à pied. **Réalisé.**
- Le tennis et les sports de raquette sont les sports à développer dans la prochaine étape. Le cyclisme et la course à pied viendront plus tard.
- Lorsqu’un utilisateur choisit un sport qui n’est pas encore développé, ouvrir une page de présentation simple, sans statistiques ni informations détaillées. La page peut indiquer que le sport est en cours de développement et afficher une icône correspondante. **Réalisé pour les sports en attente de règles ou de développement.**
- Accompagner les sports et actions importantes d’icônes cohérentes et lisibles.
- Garder le tennis comme seul sport fonctionnel dans le périmètre actuel. **Réalisé ; les autres espaces de raquette attendent les règles convenues.**

### Saisie des formats de match

Le formulaire doit proposer des formats prédéfinis et adapter la saisie du score au format choisi. Les options prévues sont :

- **Deux sets gagnants** : au maximum trois sets ; la rencontre s’arrête dès qu’un joueur ou une équipe gagne deux sets.
- **Deux sets gagnants avec super tie-break décisif** : si les deux premiers sets sont partagés, le troisième set est un super tie-break.
- **Trois sets gagnants** : au maximum cinq sets ; la rencontre s’arrête dès qu’un joueur ou une équipe gagne trois sets.
- **Trois sets gagnants avec super tie-break décisif** : si les quatre premiers sets sont partagés, le cinquième set est un super tie-break.

Le formulaire affiche les champs correspondant au format sélectionné, guide la saisie et distingue visuellement les sets classiques du super tie-break. Un super tie-break se gagne en atteignant au moins 10 points avec deux points d’écart, par exemple 10-8, 12-10 ou 16-14. La cible de 10 et l’écart de deux points sont fixes ; le jeu continue au-delà de 10 tant que l’écart de deux points n’est pas atteint.

### Entraînement à score personnalisé

L’utilisateur peut enregistrer un entraînement avec un score libre : il choisit un ou plusieurs sets/manches et saisit les scores sans limite prédéfinie. Il peut par exemple enregistrer un set joué en comptant les points, comme 25-15. Cette saisie ne suit pas les validations des formats officiels.

L’entraînement conserve les mêmes informations descriptives qu’un match : date, lieu, surface, format simple ou double, participants et leurs classements FFT, durée et ressenti. Sa catégorie reste « entraînement » et son score ne suit pas les règles des formats officiels.

Un score personnalisé est classé comme **entraînement**, reste consultable dans l’historique et n’entre pas dans les statistiques des matchs au format officiel.

### Évolution multisport

Les autres sports de raquette — badminton, tennis de table, padel et squash — reprennent la même famille d’indicateurs que le tennis, avec des règles de saisie et des scores adaptés à chaque discipline. Le cyclisme et la course à pied restent pour une étape ultérieure.

### Direction visuelle et navigation

La page d’accueil est un tableau de bord qui met rapidement en évidence les performances et les rendez-vous. Un bandeau placé à droite donne accès aux différents sports. Le choix d’un sport fonctionnel mène à son espace de performances.

La direction visuelle doit être proposée par le développeur. Elle doit privilégier l’ergonomie, une prise en main facile et la lecture rapide des informations. Des icônes cohérentes aident à repérer les sports et les actions principales.

## Décisions encore ouvertes

- Pour le badminton, le tennis de table, le padel et le squash, préciser les variantes de score, les formats officiels et les règles de fin de rencontre.
- Définir les classements ou niveaux utilisés par ces sports pour calculer les indicateurs liés au niveau des adversaires.
- Définir ultérieurement les besoins propres au cyclisme et à la course à pied.

Ces décisions sont volontairement en attente. La navigation et les écrans de présentation sont en place ; aucun score, classement ni statistique n’est simulé pour ces sports.
