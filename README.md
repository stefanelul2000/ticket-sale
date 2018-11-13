# Ticket-Sale

### About
This is a small website I created for school events. It made ticket selling way easier and quicker. 

## Screenshots
<img src="https://stefanelul2000.github.io/ticket-sale/Screenshots/home-screen.png" width="100%">
<img src="https://stefanelul2000.github.io/ticket-sale/Screenshots/sale-ticket.png" width="45%"> <img src="https://stefanelul2000.github.io/ticket-sale/Screenshots/check-ticket.png" width="45%">
<img src="https://stefanelul2000.github.io/ticket-sale/Screenshots/Statistics.png" width="45%"> <img src="https://stefanelul2000.github.io/ticket-sale/Screenshots/refund-ticket.png" width="45%">
<img src="https://stefanelul2000.github.io/ticket-sale/Screenshots/create-team-member.png" width="45%"> <img src="https://stefanelul2000.github.io/ticket-sale/Screenshots/update-rank.png" width="45%">
<img src="https://stefanelul2000.github.io/ticket-sale/Screenshots/generate-tickets.png" width="45%"> <img src="https://stefanelul2000.github.io/ticket-sale/Screenshots/add-school.png" width="45%">

## Features

As shown in the above photos there are several items that the user can do in the program.<br/>
There are also classes of users that divide as such:<br/>
1.Cannot Login (has no permission to login to the website)<br/>
2.Can See Information (has the ability to check tickets only)<br/>
3.Ticket Seller (As the above plus the ability to also sell tickets)<br/>
4.Team Manager (As the above plus the ability to refund tickets and see statistics)<br/>
5.Admin (This user has access to everything, create user, modify users, generate tickets and add school)<br/>

I gave the refund ticket option only to the team manager so as not create any problems with users doing that by mistake.

## Setup

To run the website is pretty simple. Clone the repository (but you only need public and application and the db file).<br/>
You upload the files to the web server and set the root folder to /public. Then you need to upload the database to the sql server.<br/>
Lastly in order to finalize the connection between the database and the website you need to input the database info in /application/config/config.php <br/>
You should edit the following information only:
```php
define('DB_TYPE', 'mysql');
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'name');
define('DB_USER', 'user');
define('DB_PASS', 'db_pass');
define('DB_CHARSET', 'utf8');
```


## Credits
For his help with CSS and BBF flat style.<br/>
[@Archmonger] (https://github.com/archmonger)

For his help with building the website and debugging.<br/>
[@abhishek-singhal] (https://github.com/abhishek-singhal)
