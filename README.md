# <p align="centre">Ticket-Sale</p>

### About
This is a small website I created for school events. It made ticket selling way easyer and quicker. 

## Screenshots
<img src="https://stefanelul2000.github.io/ticket-sale/screenshots/home-screen.png" width="50%">
<img src="https://stefanelul2000.github.io/ticket-sale/screenshots/sale-ticket.png" width="50%">
<img src="https://stefanelul2000.github.io/ticket-sale/screenshots/check-ticket.png" width="50%">
<img src="https://stefanelul2000.github.io/ticket-sale/screenshots/statistics.png" width="50%">
<img src="https://stefanelul2000.github.io/ticket-sale/screenshots/refund-ticket.png" width="50%">
<img src="https://stefanelul2000.github.io/ticket-sale/screenshots/create-team-member.png" width="50%">
<img src="https://stefanelul2000.github.io/ticket-sale/screenshots/update-rank.png" width="50%">
<img src="https://stefanelul2000.github.io/ticket-sale/screenshots/generate-tickets.png" width="50%">
<img src="https://stefanelul2000.github.io/ticket-sale/screenshots/add-school" width="50%">

## Feautures

As shown in the above photos there are several items that the user can do in the program.
There are also classes of users that divide as such:
1.Cannot Login (has no permission to login to the website)
2.Can See Information (has the ability to check tickets only)
3.Ticket Seller (As the above plus the ability to also sell tickets)
4.Team Manager (As the above plus the ability to refund tickets and see statistics)
5.Admin (This user has access to everything, create user, modify users, generate tickets and add school)

I gave the refund ticket option only to the team manager so as not create any problems with users doing that by mistake.

## Setup

To run the website is pretty simple. Clone the repository (but you only need public and application and the db file).
You upload the files to the webserver and set the root folder to /public. Then you need to upload the database to the sql server.
Lastly in order to finalise the connection between the database and the website you need to input the database info in /application/config/config.php
You should modify the following information only:
`
define('DB_TYPE', 'mysql');
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'name');
define('DB_USER', 'user');
define('DB_PASS', 'db_pass');
define('DB_CHARSET', 'utf8');
`


## Credits
For his help with CSS and BBF flat style.
[@Archmonger] (https://github.com/archmonger)

For his help with building the website and debugging.
[@abhishek-singhal] (https://github.com/abhishek-singhal)