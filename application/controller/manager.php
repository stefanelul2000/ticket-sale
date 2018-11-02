<?php
class Manager extends Controller{
	function __construct(){
		parent::__construct();
		$this->auth();
		$this->teammanagerCheck();
	}

	public function refund(){
		$page = "refund";
		if(isset($_POST['refund'])){
			$ticket = $this->protect($_POST['ticket']);
			if($this->model->isTicketExist($ticket)){
				if($this->model->isTicketSold($ticket)){
					$this->model->refundTicket($ticket);
					$status = 3;
				}else{
					$status = 2;
				}
			}else{
				$status = 1;
			}
		}
		require APP . 'view/layout/header.php';
		require APP . 'view/admin/refund.php';
		require APP . 'view/layout/footer.php';
	}
	public function stats(){
		$page = "stats";
		$event_date = "2018-11-16 15:30:00";
		$members = $this->model->fetchTeam();

		if(isset($_POST['update_revenue'])){
			$user = $this->protect($_POST['user_id']);
			$revenue = $this->protect($_POST['revenue']);
			$this->model->updateUserRevenue($user, $revenue);
			header('location:' . URL . 'admin/stats');
		}
		require APP . 'view/layout/header.php';
		require APP . 'view/admin/stats.php';
		require APP . 'view/layout/footer.php';
	}	
	
}