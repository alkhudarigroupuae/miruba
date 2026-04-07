<?php
if (!defined('ABSPATH')) {
    exit;
}

get_header();
?>
<div class="mirruba-container">
    <?php if (have_posts()) : ?>
        <?php while (have_posts()) : the_post(); ?>
            <article <?php post_class('mirruba-article'); ?>>
                <h1 class="mirruba-entry-title"><?php the_title(); ?></h1>
                <div class="mirruba-entry-content">
                    <?php the_content(); ?>
                </div>
            </article>
        <?php endwhile; ?>
    <?php else : ?>
        <p><?php esc_html_e('No content found.', 'mirruba-elementor'); ?></p>
    <?php endif; ?>
</div>
<?php
get_footer();
