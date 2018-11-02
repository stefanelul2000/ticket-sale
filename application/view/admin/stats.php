<head>
	
	<link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png">
	<link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png">
	<link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png">
	<link rel="manifest" href="/favicons/site.webmanifest">
	<link rel="mask-icon" href="/favicons/safari-pinned-tab.svg" color="#5bbad5">
	<link rel="shortcut icon" href="/favicons/favicon.ico">
	
</head>	

<link rel="stylesheet" href="<?php echo URL;?>lte/plugins/datatables/dataTables.bootstrap.css">
<div class="content-wrapper">
	<section class="content-header">
		<h1>Statistics
			<small></small>
		</h1>
	</section>
	<?php
	$a =  $this->model->ticketSoldAfter($event_date);
	$b = $this->model->ticketSoldBefore($event_date);
	?>
	<section class="content">
		<div class="row">
			<div class="col-md-3 col-sm-6 col-xs-12">
				<div class="info-box">
					<span class="info-box-icon bg-aqua">
						<i class="fa fa-money"></i>
					</span>
					<div class="info-box-content">
						<span class="info-box-text">Total Tickets Sold</span>
						<span class="info-box-number"><?php echo $this->model->ticketsSold();?></span>
						<?php echo ($a*20)+($b*20);?> lei
					</div>
				</div>
			</div>
			<div class="col-md-3 col-sm-6 col-xs-12">
				<div class="info-box">
					<span class="info-box-icon bg-aqua">
						<i class="fa fa-line-chart"></i>
					</span>
					<div class="info-box-content">
						<span class="info-box-text">Before Event</span>
						<span class="info-box-number"><?php echo $b;?></span>
						<?php echo $b*20;?> lei
					</div>
				</div>
			</div>
			<div class="col-md-3 col-sm-6 col-xs-12">
				<div class="info-box">
					<span class="info-box-icon bg-aqua">
						<i class="fa fa-line-chart"></i>
					</span>
					<div class="info-box-content">
						<span class="info-box-text">During Event</span>
						<span class="info-box-number"><?php echo $a;?></span>
						<?php echo $a*20;?> lei
					</div>
				</div>
			</div>
			<div class="col-md-3 col-sm-6 col-xs-12">
				<div class="info-box">
					<span class="info-box-icon bg-aqua">
						<i class="fa fa-handshake-o"></i>
					</span>
					<div class="info-box-content">
						<span class="info-box-text">Money taken</span>
						<span class="info-box-number"><?php echo $this->model->moneyTaken();?> lei</span>
					</div>
				</div>
			</div>
		</div>
		<div class="row">
			<div class="col-xs-12">
				<div class="box" style="border-top: none">
					<div class="box-header with-border">
						<h3 class="box-title">Stats</h3>
					</div>
					<div class="box-body table-responsive no-padding">
						<table id="table2" class="table table-bordered table-striped">
							<thead>
								<tr>
									<th>ID</th>
									<th>Name</th>
									<th>Role</th>
									<th>Total Tickets Sold</th>
									<th>Tickets Sold before Event</th>
									<th>Tickets Sold during Event</th>
									<th>Total Sales</th>
									<th>Remaining</th>
									<th>Money taken</th>
									<th>Update money</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								<?php foreach($members as $member){?>
								<tr>
									<td><?php echo $member->id;?></td>
									<td><?php echo $member->name;?></td>
									<td><?php echo $member->role;?></td>
									<td><?php echo $this->model->ticketsSold2($member->id);?></td>
									<td><?php echo $before = $this->model->ticketSaleBefore($member->id, $event_date);?>
										<div class="pull-right"><?php echo $before*20;?> lei</div>
									</td>
									<td><?php echo $after = $this->model->ticketSaleAfter($member->id, $event_date);?>
										<div class="pull-right"><?php echo $after*20;?> lei</div>
									</td>
									<td><?php echo $total = ($before*20) + ($after*20);?> lei</td>
									<td>
										<?php echo $diff = $total - $member->revenue;?> lei
									</td>
									<td>
										<?php echo $member->revenue;?> lei
									</td>
									<td>
										<form method="POST" action="">
											<input type="hidden" name="user_id" value="<?php echo $member->id;?>">
											<div class="form-group">
												<input type="number" class="form-control" placeholder="Enter Money received" name="revenue" required>
											</div>
										</td>
										<td>
											<button type="submit" class="btn btn-primary pull-right" name="update_revenue">Add</button>
										</form>
									</td>
								</tr>
								<?php }?>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>