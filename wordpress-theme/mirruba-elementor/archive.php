<?php
if (!defined('ABSPATH')) {
    exit;
}

get_header();
?>
<div class="mirruba-container">
    <h1 class="mirruba-entry-title"><?php the_archive_title(); ?></h1>
    <?php if (have_posts()) : ?>
        <?php while (have_posts()) : the_post(); ?>
            <article <?php post_class('mirruba-article'); ?>>
                <h2 class="mirruba-archive-title"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
                <div class="mirruba-entry-content">
                    <?php the_excerpt(); ?>
                </div>
            </article>
        <?php endwhile; ?>
        <?php the_posts_pagination(); ?>
    <?php else : ?>
        <p><?php esc_html_e('No posts found.', 'mirruba-elementor'); ?></p>
    <?php endif; ?>
</div>
<?php
get_footer();
