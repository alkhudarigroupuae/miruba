/* WooCommerce products renderer for static storefront */
(function () {
  var defaultConfig = {
    storeUrl: "",
    perPage: 24,
    currencyPrefix: "$"
  };

  var cfg = Object.assign({}, defaultConfig, window.WOO_PRODUCTS_CONFIG || {});
  var root = document.getElementById("woo-products-root");
  if (!root) return;

  var styles = document.createElement("style");
  styles.textContent = ""
    + "#woo-products-root{max-width:1200px;margin:24px auto;padding:0 16px;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif}"
    + ".woo-products-title{font-size:28px;margin:0 0 18px;color:#1f2937}"
    + ".woo-products-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}"
    + ".woo-product-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}"
    + ".woo-product-image{width:100%;height:220px;object-fit:cover;background:#f3f4f6;display:block}"
    + ".woo-product-body{padding:12px}"
    + ".woo-product-name{font-size:15px;font-weight:700;color:#111827;margin:0 0 8px;line-height:1.4;min-height:40px}"
    + ".woo-product-price{font-size:16px;font-weight:700;color:#b7791f;margin:0 0 10px}"
    + ".woo-product-btn{width:100%;padding:10px;border:none;border-radius:8px;background:#111827;color:#fff;font-weight:600;cursor:pointer}"
    + ".woo-product-btn:hover{background:#374151}"
    + ".woo-products-message{padding:12px;border-radius:8px;background:#f9fafb;color:#374151;border:1px solid #e5e7eb}";
  document.head.appendChild(styles);

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
    var p = product && product.prices ? product.prices : null;
    if (!p) return "0";
    if (typeof p.price === "string" && p.price.length > 0) {
      var n = Number(p.price) / Math.pow(10, Number(p.currency_minor_unit || 2));
      return Number.isFinite(n) ? n.toFixed(2) : "0";
    }
    return "0";
  }

  function mapProduct(product) {
    return {
      id: product.id,
      title: cleanHtml(product.name),
      description: cleanHtml(product.short_description || product.description || ""),
      image: getImage(product),
      price: getPrice(product)
    };
  }

  function updateCartCount(item) {
    try {
      var raw = localStorage.getItem("cartItems");
      var cart = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cart)) cart = [];

      var existing = null;
      for (var i = 0; i < cart.length; i += 1) {
        if (String(cart[i].id) === String(item.id)) {
          existing = cart[i];
          break;
        }
      }

      if (existing) {
        existing.quantity = Number(existing.quantity || 1) + 1;
      } else {
        cart.push({
          id: item.id,
          title: item.title,
          price: item.price,
          image: item.image,
          quantity: 1
        });
      }

      localStorage.setItem("cartItems", JSON.stringify(cart));
      window.dispatchEvent(new Event("storage"));
    } catch (err) {
      console.error("Unable to update local cart", err);
    }
  }

  function renderProducts(products) {
    if (!products || products.length === 0) {
      root.innerHTML = '<div class="woo-products-message">No products available right now.</div>';
      return;
    }

    var html = '<h2 class="woo-products-title">Latest Products</h2><div class="woo-products-grid">';
    for (var i = 0; i < products.length; i += 1) {
      var p = products[i];
      html += ''
        + '<article class="woo-product-card">'
        + '  <img class="woo-product-image" src="' + (p.image || "") + '" alt="' + (p.title || "Product") + '"/>'
        + '  <div class="woo-product-body">'
        + '    <h3 class="woo-product-name">' + (p.title || "") + '</h3>'
        + '    <p class="woo-product-price">' + cfg.currencyPrefix + p.price + "</p>"
        + '    <button class="woo-product-btn" data-add-to-cart="' + p.id + '">Add to cart</button>'
        + "  </div>"
        + "</article>";
    }
    html += "</div>";
    root.innerHTML = html;

    root.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-add-to-cart]");
      if (!btn) return;
      var id = btn.getAttribute("data-add-to-cart");
      var selected = null;
      for (var j = 0; j < products.length; j += 1) {
        if (String(products[j].id) === String(id)) {
          selected = products[j];
          break;
        }
      }
      if (!selected) return;
      updateCartCount(selected);
      btn.textContent = "Added";
      setTimeout(function () {
        btn.textContent = "Add to cart";
      }, 800);
    });
  }

  async function loadWooProducts() {
    var base = (cfg.storeUrl || "").trim();
    if (!base) {
      root.innerHTML = '<div class="woo-products-message">WooCommerce store URL is missing. Set window.WOO_PRODUCTS_CONFIG.storeUrl in index.html.</div>';
      return;
    }

    var endpoint = base.replace(/\/$/, "") + "/wp-json/wc/store/v1/products?orderby=date&order=desc&per_page=" + encodeURIComponent(cfg.perPage);
    try {
      var res = await fetch(endpoint, { credentials: "omit" });
      if (!res.ok) {
        throw new Error("WooCommerce API request failed with status " + res.status);
      }
      var data = await res.json();
      var mapped = Array.isArray(data) ? data.map(mapProduct) : [];
      renderProducts(mapped);
    } catch (err) {
      console.error(err);
      root.innerHTML = '<div class="woo-products-message">Unable to load products from WooCommerce API.</div>';
    }
  }

  loadWooProducts();
})();
