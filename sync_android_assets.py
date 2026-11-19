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

    # 1. Copy web portals
    for html_file in ["index.html", "billing.html", "inventory.html", "dashboard.html", "sw.js"]:
        src = os.path.join(BASE_DIR, html_file)
        dst = os.path.join(ASSETS_WWW, html_file)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"  [OK] Synced {html_file}")

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
