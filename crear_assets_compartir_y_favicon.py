import os
from PIL import Image

def create_sharing_and_favicon():
    logo_oficial_path = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA\Publica navojoa logotipo oficial.png"
    logo_letras_path = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA\logo letras.png"
    
    output_compartir = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA\logo-compartir.png"
    output_favicon_ico = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA\favicon.ico"
    output_favicon_png = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA\favicon.png"

    # 1. Crear imagen para compartir en WhatsApp (1200x630 px con fondo blanco limpio)
    # Esto garantiza que WhatsApp muestre la tarjeta de vista previa perfecta sin recortes extraños
    W, H = 1200, 630
    bg = Image.new("RGB", (W, H), (255, 255, 255))
    
    logo_oficial = Image.open(logo_oficial_path).convert("RGBA")
    
    # Reescalar logo a aprox 750px de ancho para que luzca imponente y nítido al compartir
    target_w = 750
    w_percent = target_w / float(logo_oficial.size[0])
    target_h = int(float(logo_oficial.size[1]) * float(w_percent))
    logo_resized = logo_oficial.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # Centrar en el canvas de 1200x630
    pos_x = (W - target_w) // 2
    pos_y = (H - target_h) // 2
    
    bg.paste(logo_resized, (pos_x, pos_y), logo_resized)
    bg.save(output_compartir, "PNG", quality=95, optimize=True)
    print("-> Creado logo-compartir.png (1200x630 px para WhatsApp / Facebook)")

    # 2. Crear favicon.ico y favicon.png a partir de logo letras.png
    logo_letras = Image.open(logo_letras_path).convert("RGBA")
    logo_letras.save(output_favicon_png, "PNG")
    
    # Guardar como ICO multi-resolución
    logo_letras.save(output_favicon_ico, format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print("-> Creados favicon.ico y favicon.png para pestaña del navegador")

if __name__ == "__main__":
    create_sharing_and_favicon()
