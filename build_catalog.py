import openpyxl
import json
import re
from collections import defaultdict, Counter

CATEGORY_CONFIG = {
    "Snacks": {
        "id": "snacks",
        "name": "Snacks",
        "malayalam": "സ്നാക്സ് & പലഹാരങ്ങൾ",
        "image": "images/banana_chips.jpg",
        "icon": "🍌",
        "description": "Authentic Kerala banana chips, crispy murukku, halwa and tea-time snacks."
    },
    "Masalas & Spices": {
        "id": "masalas-spices",
        "name": "Masalas & Spices",
        "malayalam": "മസാലകൾ & സുഗന്ധവ്യഞ്ജനങ്ങൾ",
        "image": "images/spices.jpg",
        "icon": "🌶️",
        "description": "Eastern, Aachi, pure black pepper, cardamom, fish curry masalas and Kudampuli."
    },
    "Ready to Eat & Mixes": {
        "id": "ready-to-eat-mixes",
        "name": "Ready to Eat & Mixes",
        "malayalam": "റെഡി ടു ഈറ്റ് & മിക്സുകൾ",
        "image": "images/ready_to_eat.jpg",
        "icon": "🍲",
        "description": "Palada payasam mixes, Kerala instant curries, jaggery vellam and biryani kits."
    },
    "Grains & Flours": {
        "id": "grains-flours",
        "name": "Grains & Flours",
        "malayalam": "ധാന്യങ്ങൾ & പൊടികൾ",
        "image": "images/grains_flour.jpg",
        "icon": "🌾",
        "description": "Puttu podi, appam & idiyappam flours, pulses, kadala, lentils and rawa."
    },
    "Church Articles": {
        "id": "church-articles",
        "name": "Church Articles",
        "malayalam": "ദേവാലയ വസ്തുക്കൾ",
        "image": "images/church_articles.jpg",
        "icon": "✝️",
        "description": "Communion bread, wall texts, 3D frames, crosses, keychains and devotional gifts."
    },
    "Books & Bibles": {
        "id": "books-bibles",
        "name": "Books & Bibles",
        "malayalam": "ബൈബിളുകൾ & പുസ്തകങ്ങൾ",
        "image": "images/books_bibles.jpg",
        "icon": "📖",
        "description": "Holy Bibles (Hindi, English, Malayalam), Aaradhana Geet song books, puzzle books."
    },
    "Stationery": {
        "id": "stationery",
        "name": "Stationery",
        "malayalam": "സ്റ്റേഷനറി",
        "image": "images/stationery.jpg",
        "icon": "📁",
        "description": "A4 glossy paper, lamination pouches, colors, school and office essentials."
    },
    "Healthcare Items": {
        "id": "healthcare-items",
        "name": "Healthcare Items",
        "malayalam": "ആയുർവേദ & ഹെൽത്ത് കെയർ",
        "image": "images/healthcare_ayurveda.jpg",
        "icon": "🌿",
        "description": "Chandrika Ayurvedic soaps, Cuticura, herbal body wash and traditional arishtams."
    },
    "Pickles": {
        "id": "pickles",
        "name": "Pickles",
        "malayalam": "അച്ചാറുകൾ",
        "image": "images/pickles.jpg",
        "icon": "🥭",
        "description": "Traditional Kerala cut mango, lime, fish pickles, vadukapuli and puliyinji."
    },
    "Rice Items": {
        "id": "rice-items",
        "name": "Rice Items",
        "malayalam": "അരി & ധാന്യങ്ങൾ",
        "image": "images/matta_rice.jpg",
        "icon": "🍚",
        "description": "Authentic Kerala Matta rice (Vadi, Unda), Basmati, Jeerakasala and Ponni rice."
    },
    "Electronics": {
        "id": "electronics",
        "name": "Electronics",
        "malayalam": "ഇലക്ട്രോണിക്സ്",
        "image": "images/electronics.jpg",
        "icon": "⚡",
        "description": "Fast type-C cables, memory cards (16GB-128GB), pendrives, earbuds and audio gadgets."
    },
    "Fish & Meat": {
        "id": "fish-meat",
        "name": "Fish & Meat",
        "malayalam": "മത്സ്യം & ഇറച്ചി",
        "image": "images/fish_meat.jpg",
        "icon": "🐟",
        "description": "Kerala Ayala mackerel, succulent chemmeen prawns, dried fish and duck meat."
    },
    "Beverages": {
        "id": "beverages",
        "name": "Beverages",
        "malayalam": "പാനീയങ്ങൾ",
        "image": "images/tea_coffee.jpg",
        "icon": "☕",
        "description": "AVT & Assam tea, Bru filter coffee, ginger coffee (chukku kaapi) and fruit crushes."
    },
    "Edible Oils & Ghee": {
        "id": "edible-oils-ghee",
        "name": "Edible Oils & Ghee",
        "malayalam": "എണ്ണകൾ & നെയ്യ്",
        "image": "images/coconut_oil.jpg",
        "icon": "🥥",
        "description": "Pure Kera coconut oil, Idhayam gingelly/nallenna, Milma cow ghee and mustard oil."
    },
    "Kitchen Utensils": {
        "id": "kitchen-utensils",
        "name": "Kitchen Utensils",
        "malayalam": "അടുക്കള ഉപകരണങ്ങൾ",
        "image": "images/kitchen_utensils.jpg",
        "icon": "🍳",
        "description": "Stainless steel idli steamers, coconut scraper chirava, knives and cookware."
    },
    "Kerala Clothing": {
        "id": "kerala-clothing",
        "name": "Kerala Clothing",
        "malayalam": "കേരള വസ്ത്രങ്ങൾ",
        "image": "images/kerala_clothing.jpg",
        "icon": "🥻",
        "description": "Kasavu golden border mundu, double mundu, set sarees, lungis and Christian ties."
    },
    "Household & Cleaning": {
        "id": "household-cleaning",
        "name": "Household & Cleaning",
        "malayalam": "ഗാർഹിക വൃത്തിയാക്കൽ",
        "image": "images/household_cleaning.jpg",
        "icon": "✨",
        "description": "Dishwash cleaners, car wash, toilet cleaners, combs and daily home utilities."
    },
    "Raw Items & Produce": {
        "id": "raw-items-produce",
        "name": "Raw Items & Produce",
        "malayalam": "പച്ചക്കറികൾ & തേങ്ങ",
        "image": "images/raw_produce.jpg",
        "icon": "🌱",
        "description": "Fresh Kerala coconuts, raw bananas (nendran), drumsticks and authentic tubers."
    }
}

def get_subcat(cat, name):
    n = name.upper()
    if cat == 'Snacks':
        if 'CHIP' in n: return 'Banana Chips & Chips'
        if 'HALWA' in n: return 'Kerala Halwa'
        if 'MURUK' in n or 'MURK' in n: return 'Murukku'
        if 'PEANUT' in n or 'KADALA' in n or 'NUT' in n: return 'Peanut & Nut Snacks'
        if 'CAKE' in n or 'RUSK' in n or 'BISCUIT' in n: return 'Bakery & Biscuits'
        if 'MIXTURE' in n or 'MIX' in n: return 'Kerala Mixture'
        return 'Traditional Snacks'
    elif cat == 'Masalas & Spices':
        if 'FISH' in n: return 'Fish Masala & Seasonings'
        if any(x in n for x in ['CHICKEN', 'MEAT', 'BIRYANI', 'EGG', 'KABULA']): return 'Curry & Meat Masala'
        if 'SAMBAR' in n or 'RASAM' in n: return 'Sambar & Rasam Powders'
        if 'PEPPER' in n or 'KURUMULAK' in n: return 'Black Pepper'
        if any(x in n for x in ['CARDAMOM', 'CLOVE', 'CINNAMON', 'JEERA', 'MUSTARD', 'METHI']): return 'Pure Whole Spices'
        if 'PULI' in n or 'TAMARIND' in n or 'KUDAMPULI' in n: return 'Tamarind & Kudampuli'
        if any(x in n for x in ['CHILLI', 'TURMERIC', 'CORIANDER', 'KASHMIRI', 'MANJAL']): return 'Chilli & Turmeric Powders'
        return 'Blended Masalas'
    elif cat == 'Rice Items':
        if 'VADI' in n: return 'Matta Vadi Rice'
        if 'UNDA' in n: return 'Matta Unda Rice'
        if any(x in n for x in ['BASMATI', 'BASUMATI', 'BIRIYANI']): return 'Basmati & Biryani Rice'
        if 'JEERAKASALA' in n or 'KHAIMA' in n: return 'Jeerakasala / Ghee Rice'
        if 'PONNI' in n: return 'Ponni Rice'
        if 'BROKEN' in n: return 'Broken Rice'
        return 'Kerala Speciality Rice'
    elif cat == 'Edible Oils & Ghee':
        if 'COCONUT' in n: return 'Pure Coconut Oil'
        if 'NALLENNA' in n or 'GINGELLY' in n or 'SESAME' in n: return 'Gingelly / Nallenna Oil'
        if 'GHEE' in n or 'MILMA' in n: return 'Pure Cow Ghee'
        if 'MUSTARD' in n: return 'Mustard Oil'
        return 'Cooking Oils'
    elif cat == 'Fish & Meat':
        if 'PRAWN' in n or 'CHEMMEEN' in n: return 'Prawns & Chemmeen'
        if 'AYALA' in n: return 'Ayala (Mackerel)'
        if 'CHOORA' in n or 'TUNA' in n: return 'Choora (Tuna)'
        if 'DRY' in n or 'DRIED' in n: return 'Dry Fish & Dried Prawns'
        if 'DUCK' in n: return 'Duck Meat'
        return 'Coastal Fish & Seafood'
    elif cat == 'Books & Bibles':
        if 'BIBLE' in n: return 'Holy Bibles'
        if 'GEET' in n or 'SONG' in n: return 'Christian Song Books'
        if 'CHILD' in n or 'PUZZLE' in n or 'BAL' in n: return 'Children & Youth Books'
        return 'Spiritual & Prayer Books'
    elif cat == 'Church Articles':
        if 'BREAD' in n or 'COMMUNION' in n: return 'Communion Articles'
        if any(x in n for x in ['FRAME', 'WALL TEXT', '3D', 'A3', 'A4']): return 'Wall Texts & Frames'
        if 'CROSS' in n or 'STATUE' in n: return 'Crosses & Holy Statues'
        if 'KEYCHAIN' in n or 'KEY CHAIN' in n: return 'Keychains & Gifts'
        if 'COVER' in n: return 'Bible Covers'
        if 'STAR' in n: return 'Christmas Stars & Decor'
        return 'Church & Devotional Articles'
    elif cat == 'Kerala Clothing':
        if 'KASAV' in n or 'GOLD' in n: return 'Kasavu Mundu & Sarees'
        if 'DOUBLE' in n or 'KARA' in n or 'CREAM' in n: return 'Double & Kara Mundu'
        if 'LUNGI' in n: return 'Kerala Lungies'
        if 'SAREE' in n or 'SAAREE' in n: return 'Kerala Set Sarees'
        if 'TIE' in n: return 'Christian Ties'
        return 'Traditional Wear'
    elif cat == 'Grains & Flours':
        if 'PUTTU' in n: return 'Puttu Podi'
        if 'APPAM' in n or 'IDIYAPPAM' in n: return 'Appam & Idiyappam Podi'
        if 'RAWA' in n or 'WHEAT' in n: return 'Rawa & Wheat'
        if any(x in n for x in ['DAAL', 'DAL', 'KADALA', 'BEANS', 'GRAM', 'MATTAR']): return 'Pulses & Dals'
        return 'Flours & Grains'
    elif cat == 'Pickles':
        if 'MANGO' in n: return 'Mango Pickles'
        if 'LIME' in n or 'LEMON' in n: return 'Lime & Lemon Pickles'
        if 'FISH' in n or 'ANCHOVY' in n or 'PRAWN' in n: return 'Fish & Seafood Pickles'
        if 'PULIYINJI' in n or 'VADUKAPULI' in n: return 'Traditional Specialty Pickles'
        return 'Kerala Pickles'
    elif cat == 'Ready to Eat & Mixes':
        if 'PALADA' in n or 'PAYASAM' in n: return 'Palada & Payasam Mixes'
        if 'BIRYANI' in n or 'CURRY' in n: return 'Biryani & Curry Mixes'
        if any(x in n for x in ['JAGGERY', 'VELLAM', 'KARUPPETTI', 'SHARKARA']): return 'Jaggery & Sharkkara'
        if 'CHUTNEY' in n or 'CHAMMANTHI' in n: return 'Chammanthi & Chutney Powders'
        return 'Ready to Eat & Mixes'
    elif cat == 'Beverages':
        if 'TEA' in n: return 'Kerala Tea'
        if 'COFFEE' in n: return 'Filter & Ginger Coffee'
        if any(x in n for x in ['SQUASH', 'CRUSH', 'DRINK', 'JUICE', 'MINT']): return 'Crushes & Drinks'
        return 'Beverages'
    elif cat == 'Kitchen Utensils':
        if 'IDLI' in n: return 'Idli Cookers & Makers'
        if 'CHIRAVA' in n or 'KNIFE' in n: return 'Chirava Scrapers & Knives'
        return 'Traditional Cookware'
    elif cat == 'Electronics':
        if 'CABLE' in n: return 'Fast Charging Cables'
        if 'CARD' in n or 'MEMORY' in n: return 'Memory Cards'
        if 'PENDRIVE' in n: return 'USB Pendrives'
        if any(x in n for x in ['BUD', 'PHONE', 'SPEAKER', 'EAR']): return 'Audio & Headphones'
        return 'Tech Accessories'
    elif cat == 'Stationery':
        if 'PAPER' in n: return 'Printing & Glossy Paper'
        if 'LAMINATION' in n: return 'Lamination Pouches'
        if any(x in n for x in ['PEN', 'PENCIL', 'COLOR', 'ACRYLIC']): return 'Writing & Art'
        return 'Stationery Supplies'
    elif cat == 'Healthcare Items':
        if 'SOAP' in n: return 'Ayurvedic Soaps'
        if any(x in n for x in ['WASH', 'TALC', 'BODY']): return 'Body Care & Talc'
        if any(x in n for x in ['ARISHTAM', 'ASAVAM', 'TONIC']): return 'Arishtams & Herbal Tonics'
        return 'Ayurvedic Healthcare'
    elif cat == 'Household & Cleaning':
        if any(x in n for x in ['DISH', 'RUB', 'EXO']): return 'Dishwash & Cleaners'
        if any(x in n for x in ['TOILET', 'FLOOR', 'CAR']): return 'Home Hygiene Cleaners'
        return 'Household Essentials'
    elif cat == 'Raw Items & Produce':
        if 'COCONUT' in n: return 'Fresh Coconuts'
        if 'BANANA' in n or 'PAZHAM' in n: return 'Kerala Bananas'
        return 'Fresh Produce'
    return 'General'

def build_catalog():
    print("Loading SHALOM.xlsx...")
    wb = openpyxl.load_workbook('SHALOM.xlsx', read_only=True, data_only=True)
    ws = wb['Inventory_Master']
    
    products = []
    item_counter = 1
    
    # Store category dropdown stats
    cat_subcats = defaultdict(Counter)
    cat_sample_items = defaultdict(list)
    cat_total_counts = Counter()

    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or not row[0]:
            continue
        
        name = str(row[0]).strip()
        if not name:
            continue
            
        category_raw = str(row[2]).strip() if row[2] else "Snacks"
        
        # Skip shop equipment
        if category_raw == "Fixed Assets":
            continue
            
        cfg = CATEGORY_CONFIG.get(category_raw, {
            "id": re.sub(r'[^a-z0-9]+', '-', category_raw.lower()).strip('-'),
            "name": category_raw,
            "malayalam": category_raw,
            "image": "images/banana_chips.jpg",
            "icon": "📦",
            "description": f"Quality {category_raw} items at Shalom Kerala Stores."
        })
        
        code = str(row[3]).strip() if row[3] is not None else f"SKU{item_counter:05d}"
        
        # Numbers parsing
        try:
            price = float(row[6]) if row[6] is not None else 0.0
        except (ValueError, TypeError):
            price = 0.0

        # Filter out items where selling price is 0 or nil
        if price <= 0.0:
            continue
            
        try:
            mrp = float(row[10]) if row[10] is not None else price
        except (ValueError, TypeError):
            mrp = price
            
        if mrp < price:
            mrp = price
            
        try:
            stock = int(float(row[11])) if row[11] is not None else 0
        except (ValueError, TypeError):
            stock = 0
            
        try:
            gst_rate = float(row[5]) if row[5] is not None else 0.0
        except (ValueError, TypeError):
            gst_rate = 0.0
            
        visible_raw = str(row[13]).strip().lower() if len(row) > 13 and row[13] is not None else "yes"
        is_visible = (visible_raw == "yes")
        
        subcat = get_subcat(category_raw, name)
        
        cat_subcats[cfg["id"]][subcat] += 1
        cat_total_counts[cfg["id"]] += 1
        
        product_obj = {
            "id": f"ks-{item_counter}",
            "code": code,
            "name": name,
            "category": cfg["id"],
            "categoryName": cfg["name"],
            "subCategory": subcat,
            "price": round(price, 2),
            "mrp": round(mrp, 2),
            "stock": max(0, stock),
            "inStock": (stock > 0),
            "image": cfg["image"],
            "gstRate": gst_rate,
            "description": f"Authentic {name} sourced directly for Shalom Kerala Stores, Gorakhpur.",
            "visible": is_visible
        }
        
        # Save popular / sample items for dropdown quick links (up to 6 per category)
        if len(cat_sample_items[cfg["id"]]) < 6 and (stock > 0 or len(cat_sample_items[cfg["id"]]) < 3):
            cat_sample_items[cfg["id"]].append({
                "id": product_obj["id"],
                "name": name,
                "price": product_obj["price"],
                "mrp": product_obj["mrp"],
                "inStock": product_obj["inStock"]
            })
            
        products.append(product_obj)
        item_counter += 1

    print(f"Extracted {len(products)} retail products across {len(cat_total_counts)} categories.")

    # Build category metadata list
    categories_list = []
    for raw_name, cfg in CATEGORY_CONFIG.items():
        cid = cfg["id"]
        if cid in cat_total_counts:
            # Sorted subcategories with count
            sub_items = [
                {"name": sc, "count": cnt}
                for sc, cnt in cat_subcats[cid].most_common()
            ]
            categories_list.append({
                "id": cid,
                "name": cfg["name"],
                "malayalam": cfg["malayalam"],
                "image": cfg["image"],
                "icon": cfg["icon"],
                "description": cfg["description"],
                "totalCount": cat_total_counts[cid],
                "subCategories": sub_items,
                "featuredItems": cat_sample_items[cid]
            })

    # Save to js/products_extracted.json
    with open('js/products_extracted.json', 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("Saved js/products_extracted.json")

    # Save to js/products.js
    header = """/**
 * Shalom Kerala Stores - Product Catalog & Configuration
 * Gorakhpur, Uttar Pradesh
 * Phone & UPI: 7379325499@ybl
 */

const STORE_CONFIG = {
  storeName: "Shalom Kerala Stores",
  malayalamName: "ശാലോം കേരള സ്റ്റോർസ്",
  tagline: "Authentic Kerala Groceries, Church Articles and Stationery",
  city: "Gorakhpur",
  state: "Uttar Pradesh",
  locationText: "Gorakhpur, Uttar Pradesh",
  fullAddress: "Chargawan, Near Little Flower School, Medical College Road, Gorakhpur, Uttar Pradesh - 273013",
  phone: "+91 73793 25499",
  email: "shalomkeralagkp@gmail.com",
  upiId: "7379325499@ybl",
  gstin: "09AABCS7379R1ZM",
  deliveryOptions: [
    {
      id: "pickup",
      name: "Pick from Store",
      subtitle: "Free pickup from Shalom Kerala Stores counter in Gorakhpur",
      fee: 0
    },
    {
      id: "upto5km",
      name: "Delivery Up to 5 Km",
      subtitle: "Local express delivery within 5 Km in Gorakhpur (Rs. 50)",
      fee: 50
    },
    {
      id: "upto10km",
      name: "Delivery Up to 10 Km",
      subtitle: "City delivery within 10 Km in Gorakhpur (Rs. 100)",
      fee: 100
    }
  ]
};

const GORAKHPUR_AREAS = [
  "Chargawan (Near LFS)",
  "Basharatpur",
  "Medical College Road",
  "Golghar",
  "Mohaddipur",
  "Asuran Chowk",
  "Taramandal",
  "Rapti Nagar Phase 1-4",
  "Betiahata",
  "Shahpur",
  "Rustampur",
  "Civil Lines",
  "Alinagar",
  "Dharampur",
  "Kushinagar / Deoria Route (Gorakhpur Outer)",
  "Other Location in Gorakhpur / UP"
];

const ACTIVE_COUPONS = {
  "SHALOM50": { flatDiscount: 50, minOrder: 300, desc: "Flat Rs. 50 OFF on orders above Rs. 300" },
  "KERALA10": { discountPercent: 10, maxDiscount: 150, minOrder: 250, desc: "10% Welcome Discount (Up to Rs. 150)" },
  "FREESHIP": { freeDelivery: true, minOrder: 500, desc: "Free Delivery within Gorakhpur on Rs. 500+" }
};

const SHALOM_CATEGORIES = """

    with open('js/products.js', 'w', encoding='utf-8') as out:
        out.write(header)
        json.dump(categories_list, out, ensure_ascii=False, indent=2)
        out.write(';\n\nconst SHALOM_PRODUCTS = ')
        json.dump(products, out, ensure_ascii=False)
        out.write(';\n')

    print(f"js/products.js generated with {len(products)} products and {len(categories_list)} main categories!")

if __name__ == '__main__':
    build_catalog()
