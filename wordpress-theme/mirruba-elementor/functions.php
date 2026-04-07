<?php
/**
 * Mirruba Elementor Theme Functions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Enqueue styles
function mirruba_elementor_enqueue_styles() {
	wp_enqueue_style( 'mirruba-elementor-style', get_stylesheet_uri(), array(), '1.0.0' );
	wp_enqueue_style( 'mirruba-elementor-theme-css', get_template_directory_uri() . '/assets/css/theme.css', array(), '1.0.0' );
}
add_action( 'wp_enqueue_scripts', 'mirruba_elementor_enqueue_styles' );

// Enqueue scripts
function mirruba_elementor_enqueue_scripts() {
	wp_enqueue_script( 'mirruba-elementor-theme-js', get_template_directory_uri() . '/assets/js/theme.js', array(), '1.0.0', true );
}
add_action( 'wp_enqueue_scripts', 'mirruba_elementor_enqueue_scripts' );

/**
 * Initialize WordPress MCP Adapter
 * This allows AI agents to interact with WordPress via Model Context Protocol.
 */
if ( file_exists( get_template_directory() . '/includes/mcp-adapter.php' ) ) {
    require_once get_template_directory() . '/includes/mcp-adapter.php';
}
