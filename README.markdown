scrumblr
========

what is it
----------
[scrumblr](http://scrumblr.ca) is a web-based simulation of a physical agile kanban board that supports real-time collaboration. it is built using node.js, websockets (using socket.io), CSS3, and jquery. i hope you like it.

![Wellca Board](http://scrumblr.ca/images/screenshot.png)

you can play with a demo here:

- [scrumblr.ca/demo](http://scrumblr.ca/demo)

And view a video here:

- [Video Demo](http://www.youtube.com/watch?v=gAKxyOh1zPk)

use scrumblr
------------

if you'd like to use scrumblr go to [scrumblr.ca](http://scrumblr.ca). new boards are made simply by modifying the url to something unique. e.g. your team could use a shared board at: *http://scrumblr.ca/thisisoursecretboard23423242*

alternatively, you can follow the instructions below to setup scrumblr yourself. it is very simple -- it just uses redis and node.js.

if you are a developer, please fork and submit changes/fixes.

browser support
---------------

scrumblr works on up to date chrome and firefox browsers. enable websockets for optimal performance. tested mainly on chrome for osx. this was not designed for browser support. use chrome for this app.

design philosophy
-----------------
my goal was to avoid buttons and ui (almost everything is edit in place or draggable). everything should be discoverable (no "help"). the look is meant to be as close as possible to [Well.ca's](http://well.ca) real sprint board. see picture below. many of the decisions were to make the app look and feel as much as possible like well.ca's real sprint board -- you may find this annoying but we find it kinda funny.

![Wellca Board](http://scrumblr.ca/images/DSC_7093.jpg)


how to install and run on your own computer (linux/osx)
-------------------------------------------------------

- [install redis](http://redis.io/download) (last tested on v2.8.4) (Not required if using file based JSON saving)
- [install node.js](http://nodejs.org/) (last tested on v0.10.30)
- install npm (if you're running node.js [v0.6.3](https://github.com/joyent/node/commit/b159c6) or newer it's already installed!)
- cd to the scrumblr directory; you should see server.js and config.js and other files.
- run `npm install`
- run redis `redis-server`
- run scrumblr `node server.js --port 80` where "80" is the port you have opened in your firewall and want scrumblr to run on. 
- open a browser to `http://<server>:<port>` where `<server>` is your server's url or IP address, and `<port>` is the port you chose in the previous step.

license
-------

scrumblr is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

scrumblr is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

See <http://www.gnu.org/licenses/>.

the *images* used in scrumblr, however are licensed under cc non commercial noderivs:

<a rel="license" href="http://creativecommons.org/licenses/by-nc-nd/3.0/"><img alt="Creative Commons License" style="border-width:0" src="http://i.creativecommons.org/l/by-nc-nd/3.0/80x15.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc-nd/3.0/">Creative Commons Attribution-NonCommercial-NoDerivs 3.0 Unported License</a>.

author
------

ali asaria



For developers
---

## UML diagram link

https://lucid.app/lucidchart/f13a4133-f8b8-4691-a529-0345bee0e8fe/edit?beaconFlowId=9D5F9CFD8875AF34&invitationId=inv_d0959c3c-c65a-4125-8cfe-66e44c293f7a&page=0_0#

## Redis keys


| Redis Key                                | Type    | Storage usage                                         | Redis Command          |
|------------------------------------------|---------|-----------------------------------------------|------------------------|
| `#scrumblr#-room:{ROOM}-cards`           | Hash    | All cards-related data of the room     | `hget key field`       |
| `#scrumblr#-room:{ROOM}-font`            | String  | Font related-data of the room          | `get key`              |
| `#scrumblr#-room:{ROOM}-size`            | String  | Board size-related data of the room    | `get key`              |
| `#scrumblr#-room:{ROOM}-columns`         | List    | Columns-related data of the room       | `lrange key start end` |
| `#scrumblr#-room:{ROOM}-password`        | String  | Password-related data of the room      | `get key`              |
| `#scrumblr#-room:{ROOM}-allowed-users-randintid`        | Set  | List of users allowed in a private room      | `smembers key`              |
| `room:{ROOM}`                            | String  | Owners and participants of the room    | `get key`              |
| `user:{USERNAME}:owner`                  | Set     | Rooms for which user is owner      | `smembers key`         |
| `user:{USERNAME}:participant`            | Set     | Rooms for which user is participant| `smembers key`         |
| `emails`                                 | Hash    | Emails/username pairs | `hget key field`       |
| `users`                                  | Hash    | Username/password pairs | `hget key field`       |
| `admins:users`                                  | Set    | Usernames | `smembers key`       |
| `rooms:public`                                  | Set    | Room names | `smembers key`       |



### Some Redis command lines

```bash
#scrumblr#-room:{ROOM-NAME}-cards
hgetall "#scrumblr#-room:{ROOM-NAME}-cards"
 1) "card26548220"
 2) "{\"text\":\"Investigate impact on enzyme X on cell metabolism\",\"id\":\"card26548220\",\"x\":24.727752685546875,\"y\":97.14864349365234,\"rot\":\"7.312408064328013\",\"colour\":\"green\",\"user\":\"jdoe\",\"sticker\":null}"

#scrumblr#-room:{ROOM}-font
get "#scrumblr#-room:team1_projectX_planning-font"
"{\"font\":\"Covered By Your Grace\",\"size\":15}"

#scrumblr#-room:{ROOM}-size
get "#scrumblr#-room:team1_projectX_planning-size"
"{\"width\":\"1121\",\"height\":\"718\"}"

#scrumblr#-room:{ROOM}-columns
lrange "#scrumblr#-room:team1_projectX_planning-columns" 0 -1
1) "Research Ideas"
2) "in\nprogress"
3) "Results"
4) "Reports"

#scrumblr#-room:{ROOM}-password
get "#scrumblr#-room:team1_projectX_planning-password"
"dGVzdA=="

#room:{ROOM}
get room:test
"{\"owner\":\"jdoe\",\"participants\":[\"ksoze\"]}"

#user:{USERNAME}:owner
smembers "user:jdoe:owner"
1) "team1_projectX_planning"
2) "ma room"
3) "BFA - notes mensuelles"

#user:{USERNAME}:owner
smembers "user:ksoze:participant"
1) "test"

#emails
hgetall emails
1) "john.doe@u-paris.fr"
2) "jdoe"
3) "keizer.soze@u-paris.fr"
4) "ksoze"
5) "jdoe@test.fr"
6) "jdoe"

#users
hgetall users
1) "jdoe"
2) "$2b$10$WK/4lr.gjpvC7MutfASYveTkiM4yNcGaYir9ujUiPON1.uL2i3NQ."
3) "ksoze"
4) "$2b$10$vA5wHdF.LMp9/WD4Pwxh5.IR1y9KceDjptyLD2pELPPte8QiexRDy"
5) "admin"

# get all keys with the pattern "*room*test*"
scan 0 MATCH *room*test* COUNT 100

```





Specific Rooms
---

 
# Utilisation de la room BFA_monthly Scrumblr


La room BFA_monthly est un espace collaboratif créé sur Scrumblr. Elle permet de recueillir les idées, remarques et questions de l’ensemble du personnel de recherche de l’unité. Chaque mois, les responsables de l’unité se réunissent pour examiner les notes collectées, apporter des réponses ou prendre des décisions, et mettre à jour la room pour préparer le cycle suivant.

### Où trouver la room ?

La room BFA_monthly est accessible via [Scrumblr](https://rpbs.docs.rpbs.univ-paris-diderot.fr/documentation/scrumblr). [Scrumblr](https://rpbs.docs.rpbs.univ-paris-diderot.fr/documentation/scrumblr) est une plateforme de tableau collaboratif en ligne. Si vous ne connaissez pas encore Scrumblr, consultez la [documentation détaillée](https://rpbs.docs.rpbs.univ-paris-diderot.fr/documentation/scrumblr) pour vous familiariser avec ses fonctionnalités.

### Comment accéder à la room ?

1. Enregistrez-vous dans Scrumblr en utilisant votre adresse mail institutionnelle
2. Connectez-vous à Scrumblr avec vos identifiants
3. Depuis la page 'Join a room' saisissez le nom de la room : BFA_monthly. 

Si vous n’êtes pas déjà participant, vous rejoindrez la room en tant que visiteur. Aucun mot de passe n’est requis pour accéder à cette room.

### Contribution à la room

Pour ajouter une note :

- Cliquez sur l'icône Create card (+), en haut à droite dans la room, pour créer un post-it.
- Rédigez votre idée, remarque ou question.
- Déplacez votre post-it dans une colonne si une structure spécifique a été définie.
    
Vous ne pourrez modifier ou supprimer que vos propres notes. Si un ajustement est nécessaire, contactez un responsable.

### Cycle mensuel

À la fin de chaque mois, les responsables de l’unité :

- Révisent les notes pour identifier les actions à entreprendre.
- Suppriment ou archivent les notes traitées.
- Préparent la room pour le cycle du mois suivant.

### Conseils d’utilisation

- Soyez clair et concis dans vos contributions.
- Respectez la structure (s’il y a des colonnes) pour une meilleure organisation.
- Si vous avez une question urgente, utilisez également les canaux de communication habituels pour la remonter directement.

