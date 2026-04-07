(function () {
  var defaultConfig = {
    storeUrl: "",
    perPage: 24,
    currencyPrefix: "$",
    title: "Latest Products"
  };

  var cfg = Object.assign({}, defaultConfig, window.MirrubaWooConfig || {});
  var roots = document.querySelectorAll("[data-mirruba-woo-products]");
  if (!roots.length) return;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cleanHtml(html) {
    var div = document.createElement("div");
    div.innerHTML = html || "";
    return (div.textContent || div.innerText || "").trim();
  }

  function getImage(product) {
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0].src || "";
    }
    return "";
  }

  function getPrice(product) {
    var prices = product && product.prices ? product.prices : null;
    if (!prices) return "0.00";
    if (typeof prices.price === "string" && prices.price.length > 0) {
      var n = Number(prices.price) / Math.pow(10, Number(prices.currency_minor_unit || 2));
      return Number.isFinite(n) ? n.toFixed(2) : "0.00";
    }
    return "0.00";
  }

  function mapProduct(product) {
    return {
      id: product.id,
      title: cleanHtml(product.name),
      image: getImage(product),
      price: getPrice(product)
    };
  }

  function appendStyles() {
    if (document.getElementById("mirruba-woo-products-style")) return;
    var styles = document.createElement("style");
    styles.id = "mirruba-woo-products-style";
    styles.textContent = ""
      + ".mirruba-woo-products-root{max-width:1200px;margin:24px auto;padding:0 16px}"
      + ".mirruba-products-title{font-size:28px;margin:0 0 18px;color:#1f2937}"
      + ".mirruba-products-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}"
      + ".mirruba-product-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}"
      + ".mirruba-product-image{width:100%;height:220px;object-fit:cover;background:#f3f4f6;display:block}"
      + ".mirruba-product-body{padding:12px}"
      + ".mirruba-product-name{font-size:15px;font-weight:700;color:#111827;margin:0 0 8px;line-height:1.4;min-height:40px}"
      + ".mirruba-product-price{font-size:16px;font-weight:700;color:#b7791f;margin:0 0 10px}"
      + ".mirruba-product-btn{width:100%;padding:10px;border:none;border-radius:8px;background:#111827;color:#fff;font-weight:600;cursor:pointer}"
      + ".mirruba-product-btn:hover{background:#374151}"
      + ".mirruba-products-message{padding:12px;border-radius:8px;background:#f9fafb;color:#374151;border:1px solid #e5e7eb}";
    document.head.appendChild(styles);
  }

  function renderProducts(products) {
    roots.forEach(function (root) {
      var title = root.getAttribute("data-title") || cfg.title;

      if (!products || !products.length) {
        root.innerHTML = '<div class="mirruba-products-message">No products available right now.</div>';
        return;
      }

      var html = '<h2 class="mirruba-products-title">' + escapeHtml(title) + '</h2><div class="mirruba-products-grid">';
      for (var i = 0; i < products.length; i += 1) {
        var p = products[i];
        html += ''
          + '<article class="mirruba-product-card">'
          + '<img class="mirruba-product-image" src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.title || "Product") + '"/>'
          + '<div class="mirruba-product-body">'
          + '<h3 class="mirruba-product-name">' + escapeHtml(p.title) + '</h3>'
          + '<p class="mirruba-product-price">' + escapeHtml(cfg.currencyPrefix) + escapeHtml(p.price) + '</p>'
          + '<button class="mirruba-product-btn" type="button">View Product</button>'
          + "</div>"
          + "</article>";
      }
      html += "</div>";
      root.innerHTML = html;
    });
  }

  async function loadWooProducts() {
    var base = (cfg.storeUrl || "").trim();
    if (!base) {
      renderProducts([]);
      return;
    }

    var endpoint = base.replace(/\/$/, "") + "/wp-json/wc/store/v1/products?orderby=date&order=desc&per_page=" + encodeURIComponent(cfg.perPage);

    try {
      var res = await fetch(endpoint, { credentials: "omit" });
      if (!res.ok) throw new Error("Woo API failed: " + res.status);
      var data = await res.json();
      var mapped = Array.isArray(data) ? data.map(mapProduct) : [];
      renderProducts(mapped);
    } catch (err) {
      console.error(err);
      roots.forEach(function (root) {
        root.innerHTML = '<div class="mirruba-products-message">Unable to load products from WooCommerce API.</div>';
      });
    }
  }

  appendStyles();
  loadWooProducts();
})();
