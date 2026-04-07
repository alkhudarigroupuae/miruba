/* WooCommerce products renderer for static storefront */
(function () {
  var defaultConfig = {
    storeUrl: location.origin,
    perPage: 24,
    currencyPrefix: "$",
    shopPath: "/shop"
  };

  var cfg = Object.assign({}, defaultConfig, window.WOO_PRODUCTS_CONFIG || {});
  var root = document.getElementById("woo-products-root");
  if (!root) return;
  var shopUrl = (String(cfg.storeUrl || "").replace(/\/$/, "") || "") + (cfg.shopPath || "/shop");

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
    // REST API (v3) uses product.price directly as a string
    if (typeof product.price === "string" && product.price.length > 0 && !product.prices) {
      return Number(product.price).toFixed(2);
    }
    
    // Store API uses product.prices.price as string of minor units
    var p = product && product.prices ? product.prices : null;
    if (!p) return "0.00";
    if (typeof p.price === "string" && p.price.length > 0) {
      var n = Number(p.price) / Math.pow(10, Number(p.currency_minor_unit || 2));
      return Number.isFinite(n) ? n.toFixed(2) : "0.00";
    }
    return "0.00";
  }

  function mapProduct(product) {
    return {
      id: product.id,
      title: cleanHtml(product.name),
      description: cleanHtml(product.short_description || product.description || ""),
      image: getImage(product),
      price: getPrice(product),
      permalink: product.permalink || "",
      slug: product.slug || ""
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

    var html = '<h2 class="woo-products-title">Latest Products</h2><div class="allBracelets-container">';
    for (var i = 0; i < products.length; i += 1) {
      var p = products[i];
      var priceDisplay = p.price + (cfg.currencyPrefix === "$" ? "$" : cfg.currencyPrefix);
      var slugOrId = p.slug || String(p.id || "");
      var productLink = "/product/" + slugOrId;
      
      html += ''
        + '<div class="bracelets-card">'
        + '  <a href="' + productLink + '" style="text-decoration: none; color: inherit; display: block;">'
        + '    <img src="' + (p.image || "") + '" alt="' + (p.title || "Product") + '"/>'
        + '    <div class="bracelets-details">'
        + '      <p class="title">' + (p.title || "") + '</p>'
        + '      <p class="price">' + priceDisplay + '</p>'
        + '    </div>'
        + '  </a>'
        + '</div>';
    }
    html += "</div>";
    root.innerHTML = html;
  }

  function renderError(message, details) {
    var extra = details ? "<div style=\"margin-top:8px;font-size:12px;opacity:.85;white-space:pre-wrap\">" + details + "</div>" : "";
    root.innerHTML = '<div class="woo-products-message"><strong>Unable to load products from WooCommerce API.</strong><div style="margin-top:6px">' + message + "</div>" + extra + "</div>";
  }

  async function fetchJson(url) {
    var res = await fetch(url, { 
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: "omit" 
    });
    var ct = (res.headers && res.headers.get) ? (res.headers.get("content-type") || "") : "";
    var text = await res.text();
    if (!res.ok) {
      var hint = (text || "").slice(0, 280);
      throw new Error("HTTP " + res.status + " " + res.statusText + "\n" + hint);
    }
    if (ct.indexOf("application/json") === -1 && ct.indexOf("text/plain") === -1) {
      // Cloudflare / WAF pages are HTML. Detect common verification string.
      if (/request is being verified|One moment, please|cloudflare/i.test(text)) {
        throw new Error("Blocked by Cloudflare/WAF verification page.");
      }
      // If it looks like JSON even if content-type is wrong
      if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
        try {
          return JSON.parse(text);
        } catch(e) {}
      }
      throw new Error("Response is not JSON (content-type: " + (ct || "unknown") + ").");
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error("Failed to parse JSON response.");
    }
  }

  async function loadWooProducts() {
    try {
      // Use relative paths to let Vercel proxy handle the request to admin.mirruba-jewellery.com
      var results = [];
      var perPage = Math.max(10, Math.min(Number(cfg.perPage || 100), 100));

      if (cfg.consumerKey && cfg.consumerSecret) {
        // Fetch ALL pages from REST API v3
        var page = 1;
        while (true) {
          var url = "/wp-json/wc/v3/products"
            + "?consumer_key=" + encodeURIComponent(cfg.consumerKey)
            + "&consumer_secret=" + encodeURIComponent(cfg.consumerSecret)
            + "&status=publish"
            + "&orderby=date&order=desc"
            + "&per_page=" + perPage
            + "&page=" + page;
          var batch = await fetchJson(url);
          if (!Array.isArray(batch) || batch.length === 0) break;
          results = results.concat(batch);
          if (batch.length < perPage) break;
          page += 1;
          if (page > 50) break; // hard safety limit
        }
      } else {
        // Fallback to Store API through proxy with pagination
        var p = 1;
        while (true) {
          var url2 = "/wp-json/wc/store/v1/products?orderby=date&order=desc"
            + "&per_page=" + perPage
            + "&page=" + p;
          var batch2 = await fetchJson(url2);
          if (!Array.isArray(batch2) || batch2.length === 0) break;
          results = results.concat(batch2);
          if (batch2.length < perPage) break;
          p += 1;
          if (p > 50) break;
        }
      }

      var mapped = Array.isArray(results) ? results.map(mapProduct) : [];
      renderProducts(mapped);
    } catch (err) {
      console.error(err);
      var hint = "Failed to load products. Check console for details.";
      renderError(String(err && err.message ? err.message : err), hint);
    }
  }

  loadWooProducts();
})();
