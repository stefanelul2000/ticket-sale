<?php
class Fix extends Controller{
	function __construct(){
		parent::__construct();
		$this->auth();
		$this->adminCheck();
	}

	public function index(){
		$tickets = $this->model->fetchAllTickets();
		foreach($tickets AS $ticket){
			if($ticket->school != NULL){
				$find = "&quot;";
				$replace = "”";
				$new_school = str_replace($find, $replace, $ticket->school);
				$this->model->updateFix($ticket->id, $new_school);
			}
		}
	}
}