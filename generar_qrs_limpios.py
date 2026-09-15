import os
import qrcode
from PIL import Image, ImageDraw

def generate_clean_qr(url, output_filename, color="#111827"):
    base_dir = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA"
    logo_path = os.path.join(base_dir, "Publica navojoa logotipo oficial.png")
    
    # 1. Configurar QR con alta corrección de errores (High: ~30% de recuperación de datos)
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=20,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # 2. Generar imagen base del QR
    qr_img = qr.make_image(fill_color=color, back_color="#FFFFFF").convert("RGBA")
    qr_width, qr_height = qr_img.size

    # 3. Insertar Logotipo Oficial centrado
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert("RGBA")
        logo_max_size = int(qr_width * 0.25)
        logo.thumbnail((logo_max_size, logo_max_size), Image.Resampling.LANCZOS)
        
        pad = 12
        badge_w = logo.width + pad * 2
        badge_h = logo.height + pad * 2
        
        badge = Image.new("RGBA", (badge_w, badge_h), (255, 255, 255, 0))
        draw = ImageDraw.Draw(badge)
        
        # Rectángulo redondeado blanco con borde dorado sutil
        draw.rounded_rectangle(
            [(0, 0), (badge_w - 1, badge_h - 1)],
            radius=16,
            fill=(255, 255, 255, 255),
            outline=(217, 119, 6, 200),
            width=2
        )
        badge.paste(logo, (pad, pad), mask=logo)
        
        pos_x = (qr_width - badge_w) // 2
        pos_y = (qr_height - badge_h) // 2
        qr_img.paste(badge, (pos_x, pos_y), mask=badge)

    # Guardar archivo PNG en alta calidad
    out_path = os.path.join(base_dir, output_filename)
    qr_img.convert("RGB").save(out_path, quality=100)
    print(f"[OK] QR generado: {out_path} -> Redirige a: {url}")

def main():
    # Promotor 1: https://publicanavojoa.com/qr1
    generate_clean_qr(
        url="https://publicanavojoa.com/qr1",
        output_filename="qr_promotor_1.png",
        color="#111827"
    )
    
    # Promotor 2: https://publicanavojoa.com/qr2
    generate_clean_qr(
        url="https://publicanavojoa.com/qr2",
        output_filename="qr_promotor_2.png",
        color="#111827"
    )

if __name__ == "__main__":
    main()
