import os
import base64
from PIL import Image, ImageDraw
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

def generate_banner_1640x856():
    base_bg_path = r"C:\Users\ENRIQ\.gemini\antigravity-ide\brain\57775b2c-e0ef-4841-b53d-f829175af52e\unisex_facebook_group_banner_background_1788366007399.jpg"
    logo_path = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA\Publica navojoa logotipo oficial.png"
    
    png_output = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA\portada_grupo_facebook_oficial_2026.png"
    svg_output = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA\portada_grupo_facebook_oficial_2026.svg"
    pdf_output = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA\portada_grupo_facebook_oficial_2026.pdf"
    artifact_png = r"C:\Users\ENRIQ\.gemini\antigravity-ide\brain\57775b2c-e0ef-4841-b53d-f829175af52e\portada_grupo_facebook_oficial_2026.png"

    TARGET_W = 1640
    TARGET_H = 856

    print(f"1. Cargando y reescalando fondo base a exactamente {TARGET_W}x{TARGET_H} px...")
    bg_img = Image.open(base_bg_path).convert("RGBA")
    bg_resized = bg_img.resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)

    print("2. Cargando logotipo oficial de Publica Navojoa...")
    logo_img = Image.open(logo_path).convert("RGBA")

    # Proporción para 1640x856: ancho del logo ~210px
    logo_w = 210
    w_percent = (logo_w / float(logo_img.size[0]))
    logo_h = int((float(logo_img.size[1]) * float(w_percent)))
    logo_resized = logo_img.resize((logo_w, logo_h), Image.Resampling.LANCZOS)

    # Parámetros del badge en esquina inferior derecha
    margin_right = 42
    margin_bottom = 36
    padding_x = 18
    padding_y = 14

    card_w = logo_w + (padding_x * 2)
    card_h = logo_h + (padding_y * 2)

    card_x1 = TARGET_W - card_w - margin_right
    card_y1 = TARGET_H - card_h - margin_bottom
    card_x2 = TARGET_W - margin_right
    card_y2 = TARGET_H - margin_bottom

    logo_x = card_x1 + padding_x
    logo_y = card_y1 + padding_y

    print("3. Generando imagen PNG a 1640x856 con badge y logotipo oficial...")
    final_img = bg_resized.copy()
    draw = ImageDraw.Draw(final_img)

    # Dibujar tarjeta redondeada blanca con borde dorado #d97706
    corner_radius = 18
    draw.rounded_rectangle(
        [card_x1, card_y1, card_x2, card_y2],
        radius=corner_radius,
        fill=(255, 255, 255, 255),
        outline=(217, 119, 6, 255),
        width=4
    )

    # Pegar logotipo oficial sobre tarjeta blanca
    final_img.paste(logo_resized, (logo_x, logo_y), logo_resized)

    # Guardar PNG en alta fidelidad a 1640x856 px
    final_rgb = final_img.convert("RGB")
    final_rgb.save(png_output, "PNG", quality=100)
    final_rgb.save(artifact_png, "PNG", quality=100)
    print(f"   -> PNG guardado en: {png_output} ({final_rgb.size[0]}x{final_rgb.size[1]} px)")

    print("4. Generando archivo vectorial SVG (compatible 100% con Adobe Illustrator)...")
    # Para el SVG, exportamos el fondo limpio a PNG temporal en memoria base64
    import io
    bg_clean_rgb = bg_resized.convert("RGB")
    bg_buffer = io.BytesIO()
    bg_clean_rgb.save(bg_buffer, format="JPEG", quality=95)
    bg_base64 = base64.b64encode(bg_buffer.getvalue()).decode('utf-8')

    logo_buffer = io.BytesIO()
    logo_resized.save(logo_buffer, format="PNG")
    logo_base64 = base64.b64encode(logo_buffer.getvalue()).decode('utf-8')

    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="{TARGET_W}px" 
     height="{TARGET_H}px" 
     viewBox="0 0 {TARGET_W} {TARGET_H}" 
     version="1.1">
  <title>Portada Grupo Facebook - Limpia tu closet Navojoa (1640x856)</title>
  <desc>Creado para Publica Navojoa. Compatible con Adobe Illustrator.</desc>
  
  <!-- CAPA 1: Fondo Ilustrativo y Textos del Bazar (1640x856 px) -->
  <g id="Capa_Fondo_Bazar" style="display:inline;">
    <image width="{TARGET_W}" height="{TARGET_H}" x="0" y="0" 
           xlink:href="data:image/jpeg;base64,{bg_base64}" />
  </g>

  <!-- CAPA 2: Badge Vectorial Esquina Inferior Derecha -->
  <g id="Badge_Vectorial_Dorado" style="display:inline;">
    <rect x="{card_x1}" y="{card_y1}" width="{card_w}" height="{card_h}" 
          rx="{corner_radius}" ry="{corner_radius}" 
          fill="#FFFFFF" 
          stroke="#D97706" 
          stroke-width="4" />
  </g>

  <!-- CAPA 3: Logotipo Oficial Publica Navojoa -->
  <g id="Logotipo_Publica_Navojoa" style="display:inline;">
    <image width="{logo_w}" height="{logo_h}" x="{logo_x}" y="{logo_y}" 
           xlink:href="data:image/png;base64,{logo_base64}" />
  </g>
</svg>
'''
    with open(svg_output, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"   -> SVG vectorial guardado en: {svg_output} (Mesa de trabajo 1640x856)")

    print("5. Generando archivo PDF vectorial para Adobe Illustrator (1640x856 pt)...")
    # Generar PDF nativo con mesa de trabajo exacta 1640x856
    c = canvas.Canvas(pdf_output, pagesize=(TARGET_W, TARGET_H))
    c.setTitle("Portada Limpia tu closet Navojoa - 1640x856")
    
    # Dibujar fondo
    c.drawImage(ImageReader(bg_clean_rgb), 0, 0, width=TARGET_W, height=TARGET_H)
    
    # En PDF las coordenadas Y empiezan abajo:
    pdf_card_y = TARGET_H - card_y1 - card_h
    pdf_logo_y = TARGET_H - logo_y - logo_h

    # Dibujar badge vectorial
    c.setFillColorRGB(1.0, 1.0, 1.0)
    c.setStrokeColorRGB(217/255.0, 119/255.0, 6/255.0)
    c.setLineWidth(4)
    c.roundRect(card_x1, pdf_card_y, card_w, card_h, corner_radius, stroke=1, fill=1)

    # Dibujar logo oficial
    c.drawImage(ImageReader(logo_resized), logo_x, pdf_logo_y, width=logo_w, height=logo_h, mask='auto')
    
    c.save()
    print(f"   -> PDF para Illustrator guardado en: {pdf_output} (Artboard: 1640x856 pt)")

    print("\nPROCESO COMPLETADO AL 100%:")
    print(f"1. PNG: {png_output} [1640 x 856 px]")
    print(f"2. SVG: {svg_output} [Vectorial para Illustrator, 1640 x 856]")
    print(f"3. PDF: {pdf_output} [Vectorial para Illustrator, 1640 x 856]")

if __name__ == "__main__":
    generate_banner_1640x856()
