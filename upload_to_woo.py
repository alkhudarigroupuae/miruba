import requests
import json
import base64

# WooCommerce API Configuration
WC_URL = "https://admin.mirruba-jewellery.com/wp-json/wc/v3"
CONSUMER_KEY = "ck_77bbe3263ef7549b67a8b293430e28f6b059b0d3"
CONSUMER_SECRET = "cs_7b5f93b8592b953a7adbe6464e367c48a5058726"
BASE_IMAGE_URL = "https://www.mirruba-jewellery.com"

# Setup authentication
auth = (CONSUMER_KEY, CONSUMER_SECRET)

def get_existing_categories():
    print("Fetching existing categories...")
    response = requests.get(f"{WC_URL}/products/categories", auth=auth, params={"per_page": 100})
    if response.status_code == 200:
        return {cat['name'].lower(): cat['id'] for cat in response.json()}
    else:
        print(f"Error fetching categories: {response.text}")
        return {}

def create_category(name):
    print(f"Creating category: {name}")
    data = {"name": name}
    response = requests.post(f"{WC_URL}/products/categories", auth=auth, json=data)
    if response.status_code == 201:
        return response.json()['id']
    else:
        print(f"Error creating category {name}: {response.text}")
        return None

def upload_products():
    # Load products and categories data
    with open('products.json', 'r') as f:
        products_data = json.load(f)['data']
    
    with open('categories.json', 'r') as f:
        categories_data = {str(cat['id']): cat['name'] for cat in json.load(f)['data']}

    existing_cats = get_existing_categories()
    
    # Map local category IDs to Woo Category IDs
    cat_map = {}
    for local_id, name in categories_data.items():
        name_lower = name.lower()
        if name_lower in existing_cats:
            cat_map[local_id] = existing_cats[name_lower]
        else:
            new_id = create_category(name)
            if new_id:
                cat_map[local_id] = new_id

    print(f"Starting upload of {len(products_data)} products...")
    
    for p in products_data:
        # Prepare product data
        img_path = p.get('image', '')
        if not img_path.startswith('http'):
            if not img_path.startswith('/'):
                img_path = '/' + img_path
            img_url = f"{BASE_IMAGE_URL}{img_path}"
        else:
            img_url = img_path

        product_payload = {
            "name": p['title'],
            "type": "simple",
            "regular_price": p['price'],
            "description": p['description'],
            "short_description": p['description'][:100],
            "categories": [{"id": cat_map[p['category_id']]}] if p['category_id'] in cat_map else [],
            "images": [{"src": img_url}]
        }

        print(f"Uploading: {p['title']}...")
        response = requests.post(f"{WC_URL}/products", auth=auth, json=product_payload)
        
        if response.status_code == 201:
            print(f"Successfully uploaded: {p['title']}")
        else:
            print(f"Failed to upload {p['title']}: {response.text}")

if __name__ == "__main__":
    upload_products()
