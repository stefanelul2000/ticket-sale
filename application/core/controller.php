<?php

class Controller
{
    /**
     * @var null Database Connection
     */
    public $db = null;

    /**
     * @var null Model
     */
    public $model = null;

    public $event_date = "2018-11-16 15:30:00";

    /**
     * Whenever controller is created, open a database connection too and load "the model".
     */
    function __construct()
    {
        session_start();
        $this->openDatabaseConnection();
        $this->loadModel();
        date_default_timezone_set('Europe/Bucharest');
    }

    /**
     * Open the database connection with the credentials from application/config/config.php
     */
    private function openDatabaseConnection()
    {
        // set the (optional) options of the PDO connection. in this case, we set the fetch mode to
        // "objects", which means all results will be objects, like this: $result->user_name !
        // For example, fetch mode FETCH_ASSOC would return results like this: $result["user_name] !
        // @see http://www.php.net/manual/en/pdostatement.fetch.php
        $options = array(PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_OBJ, PDO::ATTR_ERRMODE => PDO::ERRMODE_WARNING);

        // generate a database connection, using the PDO connector
        // @see http://net.tutsplus.com/tutorials/php/why-you-should-be-using-phps-pdo-for-database-access/
        $this->db = new PDO(DB_TYPE . ':host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET, DB_USER, DB_PASS, $options);
    }

    /**
     * Loads the "model".
     * @return object model
     */
    public function loadModel()
    {
        require APP . 'model/model.php';
        // create new "model" (and pass the database connection)
        $this->model = new Model($this->db);
    }

    public function protect($input){
        $input = htmlspecialchars($input);
        $input = trim($input);
        return $input;
    }

    public function auth(){
        if(isset($_SESSION['user_id'])){
            if(!$this->model->checkId($_SESSION['user_id'])){
                session_destroy();
                setcookie('fmelogin', '', time() - 36000, '/');
                header('location:' . URL . 'home');
            }
        }elseif(isset($_COOKIE['login'])){
            if($this->model->isCookieExist($_COOKIE['login'])){
                $_SESSION['user_id'] = $this->model->getCookieId($_COOKIE['login']);
            }else{
                setcookie('login', '', time() - 36000, '/');
            }
        }else{
            header('location:' . URL . 'home');
        }
    }

    public function canSee(){
        if($this->model->fetchUser($_SESSION['user_id'])->rank < 1){
            session_destroy();
            setcookie('login', '', time() - 36000, '/');
            header('location:' . URL . 'home');
        }
    }

    public function canWrite(){
        if($this->model->fetchUser($_SESSION['user_id'])->rank < 2){
            header('location:' . URL . 'user');
        }
    }

    public function teammanagerCheck (){
        if($this->model->fetchUser($_SESSION['user_id'])->rank < 3){
            header('location: ' . URL . 'user');
        }
    }

    public function adminCheck (){
        if($this->model->fetchUser($_SESSION['user_id'])->rank < 4){
            header('location: ' . URL . 'user');
        }
    }
}
