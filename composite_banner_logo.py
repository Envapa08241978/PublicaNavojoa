import os
from PIL import Image, ImageDraw

def composite_unisex_banner_with_official_logo():
    bg_path = r"C:\Users\ENRIQ\.gemini\antigravity-ide\brain\57775b2c-e0ef-4841-b53d-f829175af52e\unisex_facebook_group_banner_background_1788366007399.jpg"
    logo_path = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA\Publica navojoa logotipo oficial.png"
    output_path = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA\portada_grupo_facebook_oficial_2026.png"
    artifact_output = r"C:\Users\ENRIQ\.gemini\antigravity-ide\brain\57775b2c-e0ef-4841-b53d-f829175af52e\portada_grupo_facebook_oficial_2026.png"

    if not os.path.exists(bg_path) or not os.path.exists(logo_path):
        print("Error: Required image files not found.")
        return

    bg_img = Image.open(bg_path).convert("RGBA")
    logo_img = Image.open(logo_path).convert("RGBA")

    # Resize official logo to a subtle, elegant size (width = 175px)
    target_width = 175
    w_percent = (target_width / float(logo_img.size[0]))
    target_height = int((float(logo_img.size[1]) * float(w_percent)))
    logo_resized = logo_img.resize((target_width, target_height), Image.Resampling.LANCZOS)

    bg_w, bg_h = bg_img.size

    # Position logo in bottom right corner with nice margins
    margin_right = 35
    margin_bottom = 30

    # Create a small, elegant white rounded card for the official logo
    padding_x = 16
    padding_y = 12

    card_w = target_width + (padding_x * 2)
    card_h = target_height + (padding_y * 2)

    card_x1 = bg_w - card_w - margin_right
    card_y1 = bg_h - card_h - margin_bottom
    card_x2 = bg_w - margin_right
    card_y2 = bg_h - margin_bottom

    draw = ImageDraw.Draw(bg_img)
    
    # Draw subtle white rounded rectangle with gold border
    corner_radius = 16
    draw.rounded_rectangle(
        [card_x1, card_y1, card_x2, card_y2],
        radius=corner_radius,
        fill=(255, 255, 255, 250),
        outline=(217, 119, 6, 255),
        width=3
    )

    # Paste official logo centered inside white card
    logo_x = card_x1 + padding_x
    logo_y = card_y1 + padding_y

    bg_img.paste(logo_resized, (logo_x, logo_y), logo_resized)

    final_rgb = bg_img.convert("RGB")
    final_rgb.save(output_path, "PNG", quality=98)
    final_rgb.save(artifact_output, "PNG", quality=98)
    print("SUCCESS: Unisex inclusive banner created with official logo badge!")

if __name__ == "__main__":
    composite_unisex_banner_with_official_logo()
