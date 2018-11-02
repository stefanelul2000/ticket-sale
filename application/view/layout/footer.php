<footer class="main-footer">
	<div class="pull-right hidden-xs">
		<strong><a href="#"></a></strong>
	</div>
	<strong>Copyright &copy; Stefan Ciubotaru</strong> Toate drepturile rezervate.
</footer>
</div>
<!-- jQuery 2.2.3 -->
<script src="<?php echo URL;?>lte/plugins/jQuery/jquery-2.2.3.min.js"></script>
<!-- Bootstrap 3.3.6 -->
<script src="<?php echo URL;?>lte/bootstrap/js/bootstrap.min.js"></script>
<!-- InputMask -->
<script src="<?php echo URL;?>lte/plugins/input-mask/jquery.inputmask.js"></script>
<script src="<?php echo URL;?>lte/plugins/input-mask/jquery.inputmask.date.extensions.js"></script>
<script src="<?php echo URL;?>lte/plugins/input-mask/jquery.inputmask.extensions.js"></script>
<!-- date-range-picker -->
<!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.11.2/moment.min.js"></script> -->
<!-- bootstrap datepicker -->
<script src="<?php echo URL;?>lte/plugins/datepicker/bootstrap-datepicker.js"></script>
<!-- AdminLTE App -->
<script src="<?php echo URL;?>lte/dist/js/app.min.js"></script>
<?php if($page == "stats" || $page == "school"){?>
<script src="<?php echo URL;?>lte/plugins/datatables/jquery.dataTables.min.js"></script>
<script src="<?php echo URL;?>lte/plugins/datatables/dataTables.bootstrap.min.js"></script>
<script>
    $(function () {
        $("#table1").DataTable();
        $("#table2,#table3").DataTable({
            "paging": true,
            "lengthChange": true,
            "searching": true,
            "ordering": false,
            "info": true,
            "autoWidth": true
        });
    });
</script>
<?php }?>
<script>
	$(function () {

    //Datemask dd/mm/yyyy
    $("#datemask").inputmask("dd/mm/yyyy", {"placeholder": "dd/mm/yyyy"});
    
    //Date picker
    $('#datepicker').datepicker({
    	autoclose: true
    });

});
</script>


</body>
</html>