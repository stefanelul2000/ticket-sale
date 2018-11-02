<head>
	
	<link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png">
	<link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png">
	<link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png">
	<link rel="manifest" href="/favicons/site.webmanifest">
	<link rel="mask-icon" href="/favicons/safari-pinned-tab.svg" color="#5bbad5">
	<link rel="shortcut icon" href="/favicons/favicon.ico">
	
</head>	

<div class="content-wrapper">
	<section class="content-header">
		<h1>Verifica Bilet
			<small></small>
		</h1>
	</section>
	<section class="content">
		<div class="row">
			<div class="col-md-6">
				<?php if(isset($status)){?>
				<?php if($status == 2){?>
				<div class="alert alert-warning alert-dismissable">
					<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
					<h4><i class="icon fa fa-warning"></i> Eroare!</h4>
					Bilet Nevandut
				</div>
				<?php }elseif($status == 1){?>
				<div class="alert alert-danger alert-dismissable">
					<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
					<h4><i class="icon fa fa-ban"></i> Eroare!</h4>
					Numar bilet invalid
				</div>
				<?php }elseif($status == 3){?>
				<div class="box" style="border-top: none">
					<div class="box-header with-border">
						<h3 class="box-title">Detali Bilet</h3>
						<div class="box-tools">
							<a href="<?php echo URL;?>ticket/verify"><button class="btn btn-primary">Go Back</button></span></a>
						</div>
					</div>
					<div class="box-body">
						<form class="form-horizontal">
							<div class="form-group">
								<label class="col-sm-2">Nume</label>
								<div class="col-sm-10">
									<?php echo $info->name;?>
								</div>
							</div>
							<div class="form-group">
								<label class="col-sm-2">Varsta</label>
								<div class="col-sm-10">
									<?php echo date_diff(date_create($info->dob), date_create('today'))->y;?> Ani
								</div>
							</div>
							<div class="form-group">
								<label class="col-sm-2">Scoala</label>
								<div class="col-sm-10">
									<?php echo $info->school;?>
								</div>
							</div>
							<div class="form-group">
								<label class="col-sm-2">CNP</label>
								<div class="col-sm-10">
									<?php echo $info->cnp;?>
								</div>
							</div>
							<div class="form-group">
								<label class="col-sm-2">Numar Bilet</label>
								<div class="col-sm-10">
									<?php echo $info->id;?>
								</div>
							</div>
							<div class="form-group">
								<label class="col-sm-2">Status</label>
								<div class="col-sm-10">
									<?php if($info->checkin){
										echo "Checked In";
									}else{
										echo "Not Checked In";
									}?>
								</div>
							</div>
						</form>
						<form method="POST" action="" class="form-horizontal">
							<div class="form-group">
								<label class="col-sm-2">Update Status</label>
								<div class="col-sm-10">
									<input type="hidden" name="ticket" value="<?php echo $info->id;?>">
									<?php if($info->checkin){?>
									<button type="submit" class="btn btn-danger btn-xs" name="checkout">
										Check out
									</button>
									<?php }else{?>
									<button type="submit" class="btn btn-success btn-xs" name="checkin">
										Check in
									</button>
									<?php }?>
								</div>
							</div>
						</form>
						<hr>
						<form class="form-horizontal">
							<div class="form-group">
								<label class="col-sm-2">Vandut de</label>
								<div class="col-sm-10">
									<?php echo $this->model->fetchUser($info->user_id)->name;?>
								</div>
							</div>
							<div class="form-group">
								<label class="col-sm-2">Vandut la data de</label>
								<div class="col-sm-10">
									<?php echo date("d M Y H:i",strtotime($info->time));?>
								</div>
							</div>
						</form>
					</div>
				</div>
				<?php }}?>

				<div class="box" style="border-top: none">
					<!-- <div class="box-header with-border">
						<h3 class="box-title">numar bilet</h3>
					</div> -->
					<div class="box-body">
						<form method="GET" action="">
							<div class="form-group">
								<label for="exampleInputEmail1">Introdu numar bilet:</label>
								<input type="number" placeholder="Introdu numar bilet" class="form-control" name="ticket" required>
								
								<!-- <p class="help-block">Click icon to open camera.</p> -->
							</div>

							<div class="box-footer">
								<button type="submit" class="btn btn-primary pull-right" name="verify">Verifica</button>
								<button type="reset" class="btn btn-default">Reset</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>
