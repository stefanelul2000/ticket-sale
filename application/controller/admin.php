<?php
class Admin extends Controller{
	function __construct(){
		parent::__construct();
		$this->auth();
		$this->adminCheck();
	}

	public function index(){

	}

	public function create(){
		$page = "create";
		$members = $this->model->fetchTeam();
		if(isset($_POST['create'])){
			$name = $this->protect($_POST['name']);
			$username = strtolower($this->protect($_POST['username']));
			$password = hash('sha256', $this->protect($_POST['password']));
			$rank = $this->protect($_POST['rank']);

			if($this->model->findUser($username) == NULL){
				$cookie = hash('sha256', $username.time());
				$this->model->insertUser($name, $username, $password, $rank, $cookie);
				$status = 2;
			}else{
				$status = 1;
			}
		}

		require APP . 'view/layout/header.php';
		require APP . 'view/admin/create.php';
		require APP . 'view/layout/footer.php';
	}

	public function edit($id){
		$page = "update";
		if($id == NULL){
			header('location:' . URL . 'admin/update');
		}
		$member = $this->model->fetchUser($id);

		if(isset($_POST['edit'])){
			$name = $this->protect($_POST['name']);
			$username = strtolower($this->protect($_POST['username']));
			$password = $this->protect($_POST['password']);
			if($password == NULL){
				$this->model->updateUser($id, $name, $username);
				$status = 2;
			}else{
				$password = hash('sha256', $password);
				$this->model->updateUser2($id, $name, $username, $password);
				$status = 2;
			}
		}

		require APP . 'view/layout/header.php';
		require APP . 'view/admin/edit.php';
		require APP . 'view/layout/footer.php';
	}

	public function update(){
		$page = "update";
		$members = $this->model->fetchTeam();
		if(isset($_POST['update'])){
			$user_id = $this->protect($_POST['id']);
			$new_rank = $this->protect($_POST['new_rank']);
			if($new_rank != NULL){
				$this->model->updateRank($user_id, $new_rank);
				header('location:' . URL . 'admin/update');
			}
		}

		require APP . 'view/layout/header.php';
		require APP . 'view/admin/update.php';
		require APP . 'view/layout/footer.php';
	}

	public function ticket(){
		$page = "ticket";
		$total_tickets = $this->model->ticketsTotal();
		$sold_tickets = $this->model->ticketsSold();
		$unsold_tickets = $this->model->ticketsUnsold();
		if(isset($_POST['generate'])){
			$number = $this->protect($_POST['number']);
			$i=1;
			//include('../public/phpqrcode/qrlib.php');
			while($i <= $number){
				$qrcode = rand(100000, 999999);
				if(!$this->model->isTicketExist($qrcode)){
					$this->model->insertSeries($qrcode);
					//$this->qrcode($qrcode);
					$i++;
				}
			}
			header('location:' . URL . 'admin/ticket');
		}
		/*
		if(isset($_POST['download'])){
			$from = $this->protect($_POST['from']);
			$to = $this->protect($_POST['to']);
			if($this->model->isQRExist($from) && $this->model->isQRExist($to)){
				$files = [];
				$codes = $this->model->fetchQRcodes($from, $to);
				foreach($codes as $code){
					array_push($files, $code->id.".png");
				}
				//$files = array('869372.png', '546539.png');
				$zipname = "../public/zip/QRCODES-". $from . "-" . $to . ".zip";
				$zip = new ZipArchive;
				$zip->open($zipname, ZipArchive::CREATE);
				$path = "../public/qr/";
				foreach ($files as $file) {
					$zip->addFile($path.$file, $file);
				}
				$zip->close();
				header('location:' . URL . 'zip/QRCODES-'. $from . '-' . $to . '.zip');
			}else{
				$status = 1;
			}
		}
		*/
		require APP . 'view/layout/header.php';
		require APP . 'view/admin/ticket.php';
		require APP . 'view/layout/footer.php';
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

	public function school(){
		$page = "school";
		if(isset($_POST['school'])){
			$name = $this->protect($_POST['name']);
			if(!$this->model->isSchoolExist($name)){
				$this->model->insertSchool($name);
				$status = 2;
			}else{
				$status = 1;
			}	
		}
		$schools = $this->model->fetchSchools();
		require APP . 'view/layout/header.php';
		require APP . 'view/admin/school.php';
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