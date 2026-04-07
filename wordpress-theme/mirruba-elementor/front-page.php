<?php
if (!defined('ABSPATH')) {
    exit;
}

get_header();
?>
<div id="root"></div>
<section id="woo-products-root"></section>
<footer style="background-color: #f8f9fa; color: #333; padding: 10px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 13px; margin-top: 30px; border-top: 1px solid #ddd;">
    <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
        <span style="margin-right: 15px;">&copy; <?php echo esc_html(date_i18n('Y')); ?> mirruba-jewellery.com. All rights reserved.</span>
        <a href="<?php echo esc_url(home_url('/terms')); ?>" style="color: #666; text-decoration: none; border-bottom: 1px dashed #666;">Terms and Conditions</a>
    </div>
</footer>
<?php
get_footer();
