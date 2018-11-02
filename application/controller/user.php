<?php
class User extends Controller{
	function __construct(){
		parent::__construct();
		$this->auth();
		$this->canSee();
	}

	public function index(){
		$page = "dashboard";
		$total_tickets = $this->model->ticketsTotal();
		$sold_tickets = $this->model->ticketsSold();
		$unsold_tickets = $this->model->ticketsUnsold();
		require APP . 'view/layout/header.php';
		require APP . 'view/dashboard.php';
		require APP . 'view/layout/footer.php';
	}

	public function logout(){
		session_destroy();
		setcookie('titu_login', '', time() - 3600, '/');
		header('location:' . URL . 'home');
	}
}