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
		<h1>Vinde Bilet
			<small></small>
		</h1>
	</section>
	<section class="content">
		<div class="row">
			<div class="col-md-6">
				<?php if(isset($status)){?>
				<?php if($status == 4){?>
				<div class="alert alert-warning alert-dismissable">
					<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
					<h4><i class="icon fa fa-ban"></i> Eroare!</h4>
					Introdu numele liceului daca ai ales Other
				</div>
				<?php }elseif($status == 3){?>
				<div class="alert alert-success alert-dismissable">
					<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
					<h4><i class="icon fa fa-check"></i> Succes!</h4>
					Bilet vandut!
				</div>
				<?php }elseif($status == 2){?>
				<div class="alert alert-warning alert-dismissable">
					<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
					<h4><i class="icon fa fa-ban"></i> Eroare!</h4>
					Biletul este deja vandut!
				</div>
				<?php }else{?>
				<div class="alert alert-danger alert-dismissable">
					<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
					<h4><i class="icon fa fa-ban"></i> Eroare!</h4>
					Numar bilet invalid!
				</div>
				<?php }}?>
				<div class="box" style="border-top: none">
					<div class="box-header with-border">
						<h3 class="box-title">Introdu detalii cumparator</h3>
					</div>
					<div class="box-body">
						<form method="POST" action="">
							<div class="form-group">
								<label for="exampleInputEmail1">Introdu numar bilet:</label>
								<input type="number" placeholder="Introdu numar bilet" class="form-control" name="ticket" required>
								<!-- <p class="help-block">Click icon to open camera.</p> -->
							</div>

							<div class="form-group">
								<label for="exampleInputEmail1">Nume:</label>
								<input type="text" class="form-control" placeholder="Introdu Numele" name="name" required>
							</div>

							<div class="form-group">
								<label for="exampleInputEmail1">CNP:</label>
								<input type="number" max="9999999999999" class="form-control" placeholder="Introdu CNP" name="cnp" required>
							</div>

							<div class="form-group">
								<label>Data Nasterii:</label>
								<div class="input-group date">
									<div class="input-group-addon">
										<i class="fa fa-calendar"></i>
									</div>
									<input type="date" class="form-control pull-right" name="dob" required>
								</div>
							</div>

							<div class="form-group">
								<label>Scoala de Provenienta:</label>
								<select class="form-control" name="school_name">
									<?php foreach($schools as $school){?>
									<option value="<?php echo $school->school;?>"><?php echo $school->school;?></option>
									<?php }?>
									<option value="">Other</option>
								</select>
								<input type="text" class="form-control" placeholder="Introdu numele liceului daca ai ales Other" name="school2">
							</div>

							<div class="box-footer">
								<button type="submit" class="btn btn-primary pull-right" name="sell">Vinde</button>
								<button type="reset" class="btn btn-default">Reset</button>
							</div>
						</form>
					</div>
				</div>
			</div>
			<div class="col-md-6">
				<div class="box" style="border-top: none">
					<div class="box-header with-border">
						<h3 class="box-title">Stats</h3>
					</div>
					<div class="box-body">
						Bilete vandute de tine: <?php echo $this->model->ticketsSold2($_SESSION['user_id']);?>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>
