<?php
class Ticket extends Controller{
	function __construct(){
		parent::__construct();
		$this->auth();
		$this->canSee();
	}

	public function sell(){
		$this->canWrite();
		$page = "sell";
		$schools = $this->model->fetchSchools();
		if(isset($_POST['sell'])){
			$ticket = $this->protect($_POST['ticket']);
			$name = $this->protect($_POST['name']);
			$cnp = $this->protect($_POST['cnp']);
			$dob = date("Y-m-d", strtotime($this->protect($_POST['dob'])));
			$time = date("Y-m-d H:i:s", time());
			$school_name = $this->protect($_POST['school_name']);
			if($school_name == NULL){
				$school_name = $this->protect($_POST['school2']);
			}
			if($school_name != NULL){
				if($this->model->isTicketExist($ticket)){
					if(!$this->model->isTicketSold($ticket)){
						$this->model->sellTicket($ticket, $_SESSION['user_id'], $cnp, $name, $dob, $school_name, $time);
						$status = 3;
					}else{
						$status = 2;
					}
				}else{
					$status = 1;
				}
			}else{
				$status = 4;
			}
		}
		require APP . 'view/layout/header.php';
		require APP . 'view/sell.php';
		require APP . 'view/layout/footer.php';
	}

	public function verify(){
		$page = "verify";
		if(isset($_GET['verify'])){
			$ticket = $this->protect($_GET['ticket']);
			if($this->model->isTicketExist($ticket)){
				if($this->model->isTicketSold($ticket)){
					$info = $this->model->getTicket($ticket);
					$status = 3;
				}else{
					$status = 2;
				}
			}else{
				$status = 1;
			}
		}
		if(isset($_POST['checkin'])){
			$ticket = $this->protect($_POST['ticket']);
			$checkin = 1;
			$this->model->updateCheckIn($ticket, $checkin);
			header('location:' . URL . 'ticket/verify?ticket='.$ticket.'&verify=');
		}
		if(isset($_POST['checkout'])){
			$ticket = $this->protect($_POST['ticket']);
			$checkout = 0;
			$this->model->updateCheckIn($ticket, $checkout);
			header('location:' . URL . 'ticket/verify?ticket='.$ticket.'&verify=');
		}
		require APP . 'view/layout/header.php';
		require APP . 'view/verify.php';
		require APP . 'view/layout/footer.php';
	}
}