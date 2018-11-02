<?php

class Model
{
    /**
     * @param object $db A PDO database connection
     */
    function __construct($db)
    {
        try {
            $this->db = $db;
        } catch (PDOException $e) {
            exit('Database connection could not be established.');
        }
    }

    public function checkLogin($username, $password){
        $sql = "SELECT count(id) AS count_user FROM users WHERE username = :username AND password = :password";
        $query = $this->db->prepare($sql);
        $parameters = array(':username' => $username, ':password' => $password);
        $query->execute($parameters);
        if($query->fetch()->count_user == 1){
            return true;
        }else{
            return false;
        }
    }

    public function checkId($id){
        $sql = "SELECT count(id) AS count_user FROM users WHERE id = :id";
        $query = $this->db->prepare($sql);
        $parameters = array(':id' => $id);
        $query->execute($parameters);
        if($query->fetch()->count_user == 1){
            return true;
        }else{
            return false;
        }
    }

    public function findUser($username){
        $sql = "SELECT * FROM users WHERE username = :username";
        $query = $this->db->prepare($sql);
        $parameters = array(':username' => $username);
        $query->execute($parameters);
        return $query->fetch();
    }

    public function fetchUser($id){
        $sql = "SELECT * FROM users WHERE id = :id";
        $query = $this->db->prepare($sql);
        $parameters = array(':id' => $id);
        $query->execute($parameters);
        return $query->fetch();
    }

    public function insertUser($name, $username, $password, $rank, $cookie){
        $sql = "INSERT INTO users (name, username, password, rank, cookie) VALUES(:name, :username, :password, :rank, :cookie)";
        $query = $this->db->prepare($sql);
        $parameters = array(':name' => $name, ':username' => $username, ':password' => $password, ':rank' => $rank, ':cookie' => $cookie);
        $query->execute($parameters);
    }

    public function fetchTeam(){
        $sql = "SELECT * FROM users LEFT OUTER JOIN ranks ON users.rank = ranks.rank ORDER BY name";
        $query = $this->db->prepare($sql);
        $parameters = array('');
        $query->execute($parameters);
        return $query->fetchAll();
    }

    public function updateRank($id, $rank){
        $sql = "UPDATE users SET rank = :rank WHERE id = :id";
        $query = $this->db->prepare($sql);
        $parameters = array(':rank' => $rank, ':id' => $id);
        $query->execute($parameters);
    }

    public function updateUser($id, $name, $username){
        $sql = "UPDATE users SET name = :name, username = :username WHERE id = :id";
        $query = $this->db->prepare($sql);
        $parameters = array(':name' => $name, ':username' => $username, ':id' => $id);
        $query->execute($parameters);
    }
    
    public function updateUser2($id, $name, $username, $password){
        $sql = "UPDATE users SET name = :name, username = :username, password = :password WHERE id = :id";
        $query = $this->db->prepare($sql);
        $parameters = array(':name' => $name, ':username' => $username, ':password' => $password, ':id' => $id);
        $query->execute($parameters);
    }

    public function insertSeries($series){
        $sql = "INSERT INTO tickets (id) VALUES (:series)";
        $query = $this->db->prepare($sql);
        $parameters = array(':series' => $series);
        $query->execute($parameters);
    }

    public function ticketsTotal(){
        $sql = "SELECT count(serial) AS count_tickets FROM tickets";
        $query = $this->db->prepare($sql);
        $parameters = array('');
        $query->execute($parameters);
        return $query->fetch()->count_tickets;
    }

    public function ticketsSold(){
        $sql = "SELECT count(serial) AS count_tickets FROM tickets WHERE user_id IS NOT NULL";
        $query = $this->db->prepare($sql);
        $parameters = array('');
        $query->execute($parameters);
        return $query->fetch()->count_tickets;
    }

    public function ticketsSold2($user_id){
        $sql = "SELECT count(id) as count_tickets FROM tickets WHERE user_id = :user_id";
        $query = $this->db->prepare($sql);
        $parameters = array(':user_id' => $user_id);
        $query->execute($parameters);
        return $query->fetch()->count_tickets;

    }

    public function ticketsUnsold(){
        $sql = "SELECT count(serial) AS count_tickets FROM tickets WHERE user_id IS NULL";
        $query = $this->db->prepare($sql);
        $parameters = array('');
        $query->execute($parameters);
        return $query->fetch()->count_tickets;
    }

    public function isTicketSold($id){
        $sql = "SELECT user_id FROM tickets WHERE id = :id";
        $query = $this->db->prepare($sql);
        $parameters = array(':id' => $id);
        $query->execute($parameters);
        if($query->fetch()->user_id == NULL){
            return false;
        }else{
            return true;
        }
    }

    public function isTicketExist($id){
        $sql = "SELECT count(id) as count_ticket FROM tickets WHERE id = :id";
        $query = $this->db->prepare($sql);
        $parameters = array(':id' => $id);
        $query->execute($parameters);
        if($query->fetch()->count_ticket == 1){
            return true;
        }else{
            return false;
        }
    }

    public function sellTicket($ticket, $user_id, $cnp, $name, $dob, $school, $time){
        $sql = "UPDATE tickets SET user_id = :user_id, cnp = :cnp, name = :name, dob = :dob, school = :school, time = :time WHERE id = :ticket";
        $query = $this->db->prepare($sql);
        $parameters = array(':user_id' => $user_id, ':cnp' => $cnp, ':name' => $name, ':dob' => $dob, ':school' => $school, ':time' => $time, ':ticket' => $ticket);
        $query->execute($parameters);
    }

    public function getTicket($id){
        $sql = "SELECT * FROM tickets WHERE id = :id";
        $query = $this->db->prepare($sql);
        $parameters = array(':id' => $id);
        $query->execute($parameters);
        return $query->fetch();
    }

    public function isQRExist($serial){
        $sql = "SELECT count(id) AS count_qr FROM tickets WHERE serial = :serial";
        $query = $this->db->prepare($sql);
        $parameters = array(':serial' => $serial);
        $query->execute($parameters);
        if($query->fetch()->count_qr == 1){
            return true;
        }else{
            return false;
        }
    }

    public function fetchQRcodes($from, $to){
        $sql = "SELECT id FROM tickets WHERE serial BETWEEN :from AND :to";
        $query = $this->db->prepare($sql);
        $parameters = array(':from' => $from, ':to' => $to);
        $query->execute($parameters);
        return $query->fetchAll();
    }

    public function refundTicket($id){
        $sql = "UPDATE tickets SET user_id =  NULL, cnp = NULL, name = NULL, dob = NULL, school = NULL, time = NULL, checkin = 0 WHERE id = :id";
        $query = $this->db->prepare($sql);
        $parameters = array(':id' => $id);
        $query->execute($parameters);
    }

    public function isCookieExist($cookie){
        $sql = "SELECT count(id) as count_user FROM users WHERE cookie = :cookie";
        $query = $this->db->prepare($sql);
        $parameters = array(':cookie' => $cookie);
        $query->execute($parameters);
        if($query->fetch()->count_user == 1){
            return true;
        }else{
            return false;
        }
    }

    public function getCookieId($cookie){
        $sql = "SELECT id FROM users WHERE cookie = :cookie";
        $query = $this->db->prepare($sql);
        $parameters = array(':cookie' => $cookie);
        $query->execute($parameters);
        return $query->fetch()->id;
    }

    public function ticketSoldBefore($date){
        $sql = "SELECT count(id) as count_tickets FROM tickets WHERE time <= :date";
        $query = $this->db->prepare($sql);
        $parameters = array(':date' => $date);
        $query->execute($parameters);
        return $query->fetch()->count_tickets;
    }

    public function ticketSoldAfter($date){
        $sql = "SELECT count(id) as count_tickets FROM tickets WHERE time > :date";
        $query = $this->db->prepare($sql);
        $parameters = array(':date' => $date);
        $query->execute($parameters);
        return $query->fetch()->count_tickets;
    }

    public function ticketSaleBefore($user_id, $date){
        $sql = "SELECT count(id) as count_tickets FROM tickets WHERE user_id = :user_id AND time <= :date";
        $query = $this->db->prepare($sql);
        $parameters = array('user_id' => $user_id, ':date' => $date);
        $query->execute($parameters);
        return $query->fetch()->count_tickets;
    }

    public function ticketSaleAfter($user_id, $date){
        $sql = "SELECT count(id) as count_tickets FROM tickets WHERE user_id = :user_id AND time > :date";
        $query = $this->db->prepare($sql);
        $parameters = array('user_id' => $user_id, ':date' => $date);
        $query->execute($parameters);
        return $query->fetch()->count_tickets;
    }

    public function insertSchool($name){
        $sql = "INSERT INTO schools (school) VALUES(:name)";
        $query = $this->db->prepare($sql);
        $parameters = array(':name' => $name);
        $query->execute($parameters);
    }

    public function isSchoolExist($name){
        $sql = "SELECT count(serial) as count_school FROM schools WHERE school = :name";
        $query = $this->db->prepare($sql);
        $parameters = array(':name' => $name);
        $query->execute($parameters);
        if($query->fetch()->count_school == 1){
            return true;
        }else{
            return false;
        }
    }

    public function fetchSchools(){
        $sql = "SELECT * FROM schools";
        $query = $this->db->prepare($sql);
        $parameters = array('');
        $query->execute($parameters);
        return $query->fetchAll();
    }

    public function updateUserRevenue($user_id, $revenue){
        $sql = "UPDATE users SET revenue = revenue + :revenue WHERE id = :user_id";
        $query = $this->db->prepare($sql);
        $parameters = array(':user_id' => $user_id, ':revenue' => $revenue);
        $query->execute($parameters);
    }

    public function moneyTaken(){
        $sql = "SELECT sum(revenue) AS total FROM users";
        $query = $this->db->prepare($sql);
        $query->execute();
        return $query->fetch()->total;
    }

    public function updateCheckIn($ticket, $checkin){
        $sql = "UPDATE tickets SET checkin = :checkin WHERE id = :ticket";
        $query = $this->db->prepare($sql);
        $parameters = array(':checkin' => $checkin, ':ticket' => $ticket);
        $query->execute($parameters);
    }

    public function fetchAllTickets(){
        $sql = "SELECT * FROM tickets";
        $query = $this->db->prepare($sql);
        $query->execute();
        return $query->fetchAll();
    }

    public function updateFix($id, $school){
        $sql = "UPDATE tickets SET school = :school WHERE id = :id";
        $query = $this->db->prepare($sql);
        $parameters = array(':school' => $school, ':id' => $id);
        $query->execute($parameters);
    }
}
