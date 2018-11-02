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
		<h1>Update Ranks
			<small></small>
		</h1>
	</section>
	<section class="content">
		<div class="row">
			<div class="col-xs-12">
				<div class="box" style="border-top : none">
					<div class="box-header with-border">
						<h3 class="box-title">Current Team</h3>
					</div>
					<div class="box-body table-responsive no-padding">
						<table class="table table-hover table-bordered">
							<tr>
								<th>ID</th>
								<th>Name</th>
								<th>Username</th>
								<th>Rank</th>
								<th>Choose New Rank</th>
								<th></th>
								<th></th>
							</tr>
							<?php foreach($members as $member){?>
							<tr>
								<td><?php echo $member->id;?></td>
								<td><?php echo $member->name;?></td>
								<td><?php echo $member->username;?></td>
								<td><?php echo $member->role;?></td>
								<form method="POST" action="">
									<td>
										<input type="hidden" name="id" value="<?php echo $member->id;?>">
										<div class="form-group">
												<option value="">Choose New Role</option>
												<option value="0">Cannot Login</option>
												<option value="1">Can See Information</option>
												<option value="2">Ticket Seller</option>
												<option value="3">Team Manager</option>
												<option value="4">Admin</option>
											</select>
										</div>
									</td>
									<td>
										<button class="btn btn-primary" type="submit" name="update">Update Rank</button>
									</td>
								</form>
								<td><a href="<?php echo URL;?>admin/edit/<?php echo $member->id;?>"><span class="label label-warning">Edit</span></a></td>
							</tr>
							<?php }?>
						</table>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>