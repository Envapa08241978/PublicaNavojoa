import os
import qrcode
from PIL import Image, ImageDraw, ImageFont

def get_font(size, bold=False):
    # Intentar cargar fuentes de Windows
    font_names = ["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf"] if bold else ["segoeui.ttf", "arial.ttf", "calibri.ttf"]
    for name in font_names:
        try:
            return ImageFont.truetype(name, size)
        except:
            continue
    return ImageFont.load_default()

def generate_promoter_qr(promoter_id, promoter_title, filename_qr, filename_card, qr_color="#701a2b", header_color="#701a2b"):
    base_dir = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA"
    logo_path = os.path.join(base_dir, "Publica navojoa logotipo oficial.png")
    
    # URL de WhatsApp con mensaje precargado y código de seguimiento
    url = f"https://wa.me/526421520280?text=%C2%A1Hola!%20Quiero%20unirme%20al%20Club%20VIP%20de%20Publica%20Navojoa%20(Ref:%20{promoter_id})"
    
    # 1. Configurar QR con alta corrección de errores (High: ~30% de recuperación de datos)
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=18,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # 2. Generar imagen base del QR
    qr_img = qr.make_image(fill_color=qr_color, back_color="#FFFFFF").convert("RGBA")
    qr_width, qr_height = qr_img.size

    # 3. Insertar Logotipo Oficial centrado en el QR
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert("RGBA")
        logo_max_size = int(qr_width * 0.25)
        logo.thumbnail((logo_max_size, logo_max_size), Image.Resampling.LANCZOS)
        
        pad = 12
        badge_w = logo.width + pad * 2
        badge_h = logo.height + pad * 2
        
        badge = Image.new("RGBA", (badge_w, badge_h), (255, 255, 255, 0))
        draw = ImageDraw.Draw(badge)
        
        # Rectángulo redondeado blanco con borde sutil dorado
        draw.rounded_rectangle(
            [(0, 0), (badge_w - 1, badge_h - 1)],
            radius=16,
            fill=(255, 255, 255, 255),
            outline=(217, 119, 6, 220),
            width=3
        )
        badge.paste(logo, (pad, pad), mask=logo)
        
        pos_x = (qr_width - badge_w) // 2
        pos_y = (qr_height - badge_h) // 2
        qr_img.paste(badge, (pos_x, pos_y), mask=badge)

    # Guardar archivo PNG individual del QR
    out_qr_path = os.path.join(base_dir, filename_qr)
    qr_img.convert("RGB").save(out_qr_path, quality=100)
    print(f"[OK] QR guardado: {out_qr_path}")

    # 4. Crear Tarjeta Imprimible / Volante Digital (1080 x 1440 px)
    card_w = 1080
    card_h = 1440
    card = Image.new("RGBA", (card_w, card_h), (248, 250, 252, 255))
    draw_card = ImageDraw.Draw(card)

    # Fuentes
    font_brand = get_font(42, bold=True)
    font_sub = get_font(22, bold=True)
    font_badge = get_font(26, bold=True)
    font_scan = get_font(40, bold=True)
    font_desc = get_font(23, bold=False)
    font_footer = get_font(19, bold=False)

    # Header Superior Elegante
    header_h = 280
    # Dibujar fondo header
    draw_card.rectangle([(0, 0), (card_w, header_h)], fill=header_color)
    # Línea dorada de acento
    draw_card.rectangle([(0, header_h - 8), (card_w, header_h)], fill="#d97706")

    # Logo oficial en el header si existe
    if os.path.exists(logo_path):
        header_logo = Image.open(logo_path).convert("RGBA")
        # Tarjeta blanca para el logo en el header
        h_logo_max = 85
        header_logo.thumbnail((260, h_logo_max), Image.Resampling.LANCZOS)
        
        hl_pad_x, hl_pad_y = 18, 8
        hl_box_w = header_logo.width + hl_pad_x * 2
        hl_box_h = header_logo.height + hl_pad_y * 2
        hl_box_x = (card_w - hl_box_w) // 2
        hl_box_y = 28
        
        draw_card.rounded_rectangle(
            [(hl_box_x, hl_box_y), (hl_box_x + hl_box_w, hl_box_y + hl_box_h)],
            radius=14,
            fill=(255, 255, 255, 255)
        )
        card.paste(header_logo, (hl_box_x + hl_pad_x, hl_box_y + hl_pad_y), mask=header_logo)
        
        # Subtítulo Club VIP
        draw_card.text((card_w // 2, hl_box_y + hl_box_h + 24), "CLUB VIP DE OFERTAS & REMATES EXCLUSIVOS", fill="#fef3c7", font=font_sub, anchor="mm")
    else:
        draw_card.text((card_w // 2, 70), "PUBLICA NAVOJOA", fill="#ffffff", font=font_brand, anchor="mm")
        draw_card.text((card_w // 2, 125), "CLUB VIP DE OFERTAS & REMATES EXCLUSIVOS", fill="#fef3c7", font=font_sub, anchor="mm")

    # Badge Identificador del Promotor (Debajo del header)
    badge_y = header_h + 30
    badge_w = 480
    badge_h = 54
    bx = (card_w - badge_w) // 2
    draw_card.rounded_rectangle(
        [(bx, badge_y), (bx + badge_w, badge_y + badge_h)],
        radius=27,
        fill="#fef3c7",
        outline="#d97706",
        width=2
    )
    draw_card.text((card_w // 2, badge_y + badge_h // 2), f"ASESOR DE DIFUSIÓN: {promoter_title.upper()}", fill="#92400e", font=font_badge, anchor="mm")

    # Contenedor Blanco para el Código QR
    qr_card_size = 620
    qr_resized = qr_img.resize((qr_card_size, qr_card_size), Image.Resampling.LANCZOS)
    
    box_pad = 26
    box_w = qr_card_size + box_pad * 2
    box_h = qr_card_size + box_pad * 2
    box_x = (card_w - box_w) // 2
    box_y = badge_y + badge_h + 25

    draw_card.rounded_rectangle(
        [(box_x, box_y), (box_x + box_w, box_y + box_h)],
        radius=30,
        fill="#ffffff",
        outline="#e2e8f0",
        width=3
    )
    card.paste(qr_resized, (box_x + box_pad, box_y + box_pad), mask=qr_resized)

    # Textos de Instrucción
    txt_y = box_y + box_h + 35
    draw_card.text((card_w // 2, txt_y), "¡ESCANEA CON LA CÁMARA DE TU CELULAR!", fill="#0f172a", font=font_scan, anchor="mm")
    draw_card.text((card_w // 2, txt_y + 44), "Recibe el Catálogo Semanal de Descuentos en Navojoa directo en tu WhatsApp", fill="#475569", font=font_desc, anchor="mm")
    
    # Pie de página / Metadata
    draw_card.text((card_w // 2, card_h - 45), f"WhatsApp Oficial: +52 642 152 0280  •  Control: {promoter_id}  •  publicanavojoa.com", fill="#94a3b8", font=font_footer, anchor="mm")

    out_card_path = os.path.join(base_dir, filename_card)
    card.convert("RGB").save(out_card_path, quality=100)
    print(f"[OK] Tarjeta Promotor guardada: {out_card_path}")

def main():
    # 1. Promotor 1 (Guinda Institucional)
    generate_promoter_qr(
        promoter_id="P1",
        promoter_title="Promotor 1",
        filename_qr="qr_whatsapp_promotor_1.png",
        filename_card="tarjeta_qr_promotor_1.png",
        qr_color="#701a2b",
        header_color="#701a2b"
    )
    
    # 2. Promotor 2 (Azul Marino / Dark Slate)
    generate_promoter_qr(
        promoter_id="P2",
        promoter_title="Promotor 2",
        filename_qr="qr_whatsapp_promotor_2.png",
        filename_card="tarjeta_qr_promotor_2.png",
        qr_color="#0f172a",
        header_color="#0f172a"
    )

if __name__ == "__main__":
    main()
