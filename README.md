# Matchpoint — suivi des performances sportives

## Vision du projet

Créer une application web ergonomique destinée à plusieurs utilisateurs. Chaque personne possède un compte et saisit ses propres données sportives. Le produit est d’abord optimisé pour ordinateur ; les données ne sont pas publiques ou partagées entre comptes.

Les sports envisagés à terme sont le tennis, le badminton, le tennis de table, le padel, le squash, le cyclisme et la course à pied. Le MVP porte uniquement sur le tennis. Toutes les activités sont saisies manuellement : aucune connexion à une montre ou à un service sportif n’est prévue.

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

## Besoin fonctionnel du MVP tennis

### Comptes et confidentialité

- Un visiteur peut créer un compte et se connecter.
- Un utilisateur connecté peut consulter, créer, modifier et supprimer ses matchs et ses rendez-vous.
- Chaque compte ne peut accéder qu’à ses propres données.
- Les états de création de compte, connexion, déconnexion et absence de données sont pris en charge.

### Enregistrer un match joué

L’action principale est **« Enregistrer un match »**. Un match contient :

- sa nature : amical ou tournoi ;
- son format : simple ou double ;
- sa date, son lieu et sa surface ;
- le format de rencontre : deux ou trois sets gagnants, avec ou sans super tie-break ;
- le score de chaque set, exprimé en jeux, avec identification d’un super tie-break ;
- sa durée en minutes et le ressenti du sportif sur une échelle de 1 à 10.

Pour un tournoi, le tour (par exemple premier tour ou demi-finale) est conservé séparément du lieu.

En simple, les informations des deux joueurs, dont l’adversaire, sont saisies. En double, les noms, prénoms et classements des quatre participants sont saisis, répartis en deux équipes. L’équipe de l’utilisateur est clairement indiquée.

Le classement FFT est saisi manuellement pour chaque participant au moment du match. La valeur `NC` est prévue. Les rangs ont un ordre explicite allant du moins bien classé (`NC`) au mieux classé (`-30`) ; les comparaisons se font selon cet ordre et jamais comme du texte.

Le score conserve les jeux de chaque set, sans les points à l’intérieur des jeux. Exemple :

```text
Jean vs Arnaud
6-4
5-7
7-1 (super tie-break)
```

### Historique et statistiques

L’historique présente la date, le résultat, l’adversaire ou les joueurs concernés, le score et le contexte du match. Les statistiques de simple et de double restent séparées et affichent :

- nombre de matchs joués, victoires et défaites ;
- ratio de victoires (victoires divisées par matchs joués) ;
- meilleure victoire, c’est-à-dire une victoire contre l’adversaire au meilleur classement FFT affronté ;
- graphique du nombre de matchs par mois ;
- taux de victoire contre des adversaires mieux classés et contre des adversaires moins bien classés.

Le tableau de bord indique quand une statistique n’est pas encore calculable, notamment en l’absence de matchs ou de classements exploitables.

Pour le double, les taux contre des équipes mieux ou moins bien classées sont comparés à partir de la moyenne des rangs numériques des deux équipes. Les matchs sans classement complet sont exclus de ces deux taux.

### Planifier un match

Un rendez-vous à venir contient la date, l’heure, le lieu, le nom de l’adversaire et son classement éventuel. Il apparaît sous forme de carte récapitulative et peut être modifié ou supprimé.

La planification est un aide-mémoire personnel : elle n’envoie pas d’invitation ni de notification. Un rendez-vous ne devient pas automatiquement un match joué ; le résultat est enregistré manuellement dans l’historique.

### Ergonomie et périmètre

- L’interface est organisée autour du tableau de bord, de l’historique, de l’enregistrement des matchs et de la planification.
- Les formulaires guident la saisie et présentent les erreurs.
- Les chiffres de simple et de double ne sont jamais agrégés.
- Le MVP n’ajoute pas de fonctionnalités sportives non prévues et ne développe pas les autres sports envisagés.

## Fonctionnalités livrées

- Inscription, connexion, déconnexion et sessions persistantes.
- Gestion complète des matchs amicaux et de tournoi, en simple et en double.
- Classements FFT, équipes, surfaces, format, tour, score par set, super tie-break, durée et ressenti.
- Tableau de bord, historique et statistiques séparées entre simple et double.
- Rendez-vous visuels, modifiables et supprimables.
- Isolement des données par utilisateur côté API et base de données.


## Décisions et évolutions possibles

- Les rendez-vous et matchs joués sont des enregistrements distincts ; il n’y a pas de conversion automatique.
- Les classements sont ceux saisis par l’utilisateur au moment du match.
- Les sports autres que le tennis, les invitations, les notifications et les connexions à des services tiers restent hors périmètre du MVP.
- Une action explicite pour convertir un rendez-vous en match joué pourra être ajoutée si elle est souhaitée.
