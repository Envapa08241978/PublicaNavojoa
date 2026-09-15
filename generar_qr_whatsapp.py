import os
import qrcode
from PIL import Image, ImageDraw, ImageOps

def create_qr_with_logo():
    url = "https://wa.me/526421520280"
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

    # 2. Generar imagen base del QR en RGB
    qr_img = qr.make_image(fill_color="#111827", back_color="#FFFFFF").convert("RGBA")
    
    # 3. Cargar el logotipo oficial
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert("RGBA")
        
        # Calcular tamaño del logo (aprox 22-25% del tamaño total del QR para garantizar 100% de escaneo)
        qr_width, qr_height = qr_img.size
        logo_max_size = int(qr_width * 0.26)
        
        # Redimensionar logo manteniendo proporción
        logo.thumbnail((logo_max_size, logo_max_size), Image.Resampling.LANCZOS)
        
        # Crear un contenedor blanco con esquinas redondeadas para el logo
        pad = 12
        badge_w = logo.width + pad * 2
        badge_h = logo.height + pad * 2
        
        badge = Image.new("RGBA", (badge_w, badge_h), (255, 255, 255, 0))
        draw = ImageDraw.Draw(badge)
        
        # Dibujar rectángulo redondeado blanco con borde sutil dorado/elegante
        radius = 16
        draw.rounded_rectangle(
            [(0, 0), (badge_w - 1, badge_h - 1)],
            radius=radius,
            fill=(255, 255, 255, 255),
            outline=(217, 119, 6, 180), # Borde dorado sutil
            width=2
        )
        
        # Pegar logo centrado en el badge
        badge.paste(logo, (pad, pad), mask=logo)
        
        # Calcular posición central en el QR
        pos_x = (qr_width - badge_w) // 2
        pos_y = (qr_height - badge_h) // 2
        
        # Pegar el badge en el QR
        qr_img.paste(badge, (pos_x, pos_y), mask=badge)
        
        # Guardar versión estándar (Dark Slate / Dorado)
        output_png = os.path.join(base_dir, "qr_whatsapp_publica_navojoa.png")
        qr_img.convert("RGB").save(output_png, quality=100)
        print(f"QR generado exitosamente en: {output_png} (Dimensiones: {qr_img.size})")

    # 4. Generar versión Institucional Color Guinda / Vino de Publica Navojoa
    qr_guinda = qr.make_image(fill_color="#701a2b", back_color="#FFFFFF").convert("RGBA")
    if os.path.exists(logo_path):
        qr_guinda.paste(badge, (pos_x, pos_y), mask=badge)
        output_guinda = os.path.join(base_dir, "qr_whatsapp_publica_navojoa_guinda.png")
        qr_guinda.convert("RGB").save(output_guinda, quality=100)
        print(f"QR Guinda institucional generado en: {output_guinda}")

if __name__ == "__main__":
    create_qr_with_logo()
