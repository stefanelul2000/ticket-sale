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
		<h1>Edit Team Member's Details
			<small></small>
		</h1>
	</section>
	<section class="content">
		<div class="row">
			<div class="col-md-6">
				<?php if(isset($status)){?>
				<?php if($status == 2){?>
				<div class="alert alert-success alert-dismissable">
					<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
					<h4><i class="icon fa fa-check"></i> Success!</h4>
					Details Updated Successfully.
				</div>
				<?php }else{?>
				<div class="alert alert-danger alert-dismissable">
					<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
					<h4><i class="icon fa fa-ban"></i> Error!</h4>
					Unsuccessful!
				</div>
				<?php }}?>
				<div class="box" style="border-top: none">
					<div class="box-header with-border">
						<h3 class="box-title">Edit Details</h3>
					</div>
					<div class="box-body">
						<form method="POST" action="">
							<div class="form-group">
								<label for="exampleInputEmail1">Name</label>

								<input type="text" class="form-control" placeholder="Enter Full Name" name="name" value="<?php echo $member->name;?>" required>
							</div>

							<div class="form-group">
								<label for="exampleInputEmail1">Username</label>

								<input type="text" class="form-control" name="username" value="<?php echo $member->username;?>" required>
							</div>

							<div class="form-group">
								<label for="exampleInputEmail1">Password</label>

								<input type="text" class="form-control" placeholder="Enter Password" name="password">
								<p class="help-block">Leave blank if you don't want to update password!</p>
							</div>

							<div class="box-footer">
								<button type="submit" class="btn btn-primary pull-right" name="edit">Edit Details</button>
								<button type="reset" class="btn btn-default">Reset</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>