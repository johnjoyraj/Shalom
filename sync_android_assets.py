"""
Shalom Kerala Stores - Android Asset Synchronizer
Copies web assets (index.html, css/, js/, images/) into android/app/src/main/assets/www/
"""
import os
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_WWW = os.path.join(BASE_DIR, "android", "app", "src", "main", "assets", "www")

def sync_assets():
    print(f"Syncing web storefront assets to {ASSETS_WWW}...")
    os.makedirs(ASSETS_WWW, exist_ok=True)

    # 1. Copy index.html
    src_html = os.path.join(BASE_DIR, "index.html")
    dst_html = os.path.join(ASSETS_WWW, "index.html")
    shutil.copy2(src_html, dst_html)
    print("  [OK] Synced index.html")

    # 2. Copy directories: css, js, images
    for folder in ["css", "js", "images"]:
        src_folder = os.path.join(BASE_DIR, folder)
        dst_folder = os.path.join(ASSETS_WWW, folder)
        if os.path.exists(src_folder):
            if os.path.exists(dst_folder):
                shutil.rmtree(dst_folder)
            shutil.copytree(src_folder, dst_folder)
            print(f"  [OK] Synced {folder}/")

    # 3. Copy manifest.json if exists
    manifest_src = os.path.join(BASE_DIR, "manifest.json")
    if os.path.exists(manifest_src):
        shutil.copy2(manifest_src, os.path.join(ASSETS_WWW, "manifest.json"))
        print("  [OK] Synced manifest.json")

    print("Store assets successfully synchronized into Android project!")

if __name__ == "__main__":
    sync_assets()
