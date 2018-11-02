<!DOCTYPE html>
<html>
<head>
	
	<link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png">
	<link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png">
	<link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png">
	<link rel="manifest" href="/favicons/site.webmanifest">
	<link rel="mask-icon" href="/favicons/safari-pinned-tab.svg" color="#5bbad5">
	<link rel="shortcut icon" href="/favicons/favicon.ico">

	<meta name="msapplication-TileColor" content="#da532c">
	<meta name="theme-color" content="#ffffff">
	<meta name="msapplication-config" content="/favicons/browserconfig.xml">
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
	<link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css">
	<link href='https://fonts.googleapis.com/css?family=Varela+Round' rel='stylesheet' type='text/css'>
	<link href = "<?php echo URL;?>css/style.css" rel = "stylesheet" type = "text/css">
	<title>Balul Bobocilor - Login</title>
</head>
<body>
	<div class="text-center" style="padding:50px 0">
		<div class="logo">Balul Bobocilor</div>
		<!-- Main Form -->
		<div class="login-form-1">
			<form id="login-form" class="text-left" method = "POST" action = "">
				<div class="login-form-main-message"></div>
				<div class="main-login-form">
					<div class="login-group">
						<div class="form-group">
							<label for="lg_username" class="sr-only"></label>
							<input type="text" class="form-control" id="lg_username" name="username" placeholder="username" required>
						</div>
						<div class="form-group">
							<label for="lg_password" class="sr-only"></label>
							<input type="password" class="form-control" id="lg_password" name="password" placeholder="parola" required>
						</div>
					</div>
					<button type="submit" name = "login" class="login-button"><i class="fa fa-chevron-right"></i></button>
				</div>
				<div class="etc-login-form">
					<?php if(isset($message)){ echo $message; }?>
					<!-- 				<p>forgot your password? <a href="#">click here</a></p> -->
					<!-- 				<p>new user? <a href="#">create new account</a></p> -->
				</div>
			</form>
		</div>
		<!-- end:Main Form -->
	</div>
</body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery-validate/1.13.1/jquery.validate.min.js"></script>
<script src="<?php echo URL;?>js/main.js"></script>
</html>
