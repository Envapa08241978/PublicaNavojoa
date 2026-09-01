import os
import json
import time
import requests
from datetime import datetime
from flask import Flask, request, jsonify

app = Flask(__name__)

# Configuración Meta WhatsApp Cloud API
VERIFY_TOKEN = "publica_navojoa_token_2026"
PHONE_ID = "1280742211792981"
ACCESS_TOKEN = "EAAUPiVpET1YBST456Cx6ZAuNEXN8iEghj5W3msjAvZC4q8unGAcJrpeOdMBNNokantyZBcAYJS64NEx7XAV9tneN0MY6s3K2KphrgvJLzeVvpWZAvXXhDxxdMsUyQZBBaYzzDfNrcdZCFWNyaCvZBvQpyZB7wdp0m33Ytwy0uwZAN0W57js1ag6ZBAtZCNL4p2A4nRLTAZDZD"

STORE_FILE = os.path.join(os.path.dirname(__file__), "chat_store.json")

def load_store():
    if os.path.exists(STORE_FILE):
        try:
            with open(STORE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"contacts": {}, "messages": []}

def save_store(data):
    with open(STORE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def send_whatsapp_message(to_phone, text):
    """ Envia mensaje de texto libre via Meta Graph API """
    url = f"https://graph.facebook.com/v20.0/{PHONE_ID}/messages"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": text}
    }
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=10)
        print(f"[BOT RES] Enviado a {to_phone}: {res.status_code}")
    except Exception as e:
        print("[BOT ERROR] Error enviando mensaje:", str(e))

def send_whatsapp_template(to_phone, template_name="bienvenida_club_vip", lang="es"):
    """ Envia plantilla oficial pre-aprobada por Meta """
    url = f"https://graph.facebook.com/v20.0/{PHONE_ID}/messages"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": lang}
        }
    }
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=10)
        print(f"[BOT TEMPLATE] Enviada plantilla {template_name} a {to_phone}: {res.status_code}")
    except Exception as e:
        print("[BOT ERROR] Error enviando plantilla:", str(e))

def process_bot_rules(sender_phone, raw_phone, sender_name, msg_text):
    """ Motor del Bot Inteligente para Publica Navojoa """
    text_lower = msg_text.lower().strip()
    
    # Formato de telefono para Meta (52 + 10 digitos)
    meta_to = raw_phone
    if len(raw_phone) == 10:
        meta_to = "52" + raw_phone
        
    print(f"[BOT REGULA] Analizando mensaje de {sender_name}: '{text_lower}'")

    # Regla 1: Registro al Club VIP / Mensaje de Bienvenida
    if "club vip" in text_lower or "unirme" in text_lower or "hola" in text_lower or "bienvenid" in text_lower:
        send_whatsapp_template(meta_to, "bienvenida_club_vip", "es")
        return

    # Regla 2: Ver Catálogo de Ofertas
    if "catálogo" in text_lower or "catalogo" in text_lower or "oferta" in text_lower or "remate" in text_lower:
        respuesta = (
            "🛍️ *Catálogo Semanal de Ofertas de Navojoa* 🛍️\n\n"
            "Aquí tienes los remates de la semana:\n"
            "1. 🪑 Mueblería y Decoración — Muebles de Ocasión\n"
            "2. 👗 Ropa y Accesorios — Descuentos de Temporada\n"
            "3. 🍽️ Restaurantes Locales — Promociones 2x1\n\n"
            "📌 ¿Te interesa anunciar tu negocio o vender algún producto? Responde con *ANUNCIAR*."
        )
        send_whatsapp_message(meta_to, respuesta)
        return

    # Regla 3: Paquetes Publicitarios para Negocios
    if "anunciar" in text_lower or "paquete" in text_lower or "publicidad" in text_lower or "precio" in text_lower:
        respuesta = (
            "📢 *Paquetes Publicitarios — Publica Navojoa* 🚀\n\n"
            "Llega a más de 78,700 personas en la ciudad:\n\n"
            "🥉 *Bronce ($600 MXN)*: Publicación fijada en Grupo FB por 7 días + Envió a lista VIP.\n"
            "🥈 *Plata VIP ($1,200 MXN)*: Publicación fijada 15 días + Difusión WhatsApp + Campaña Meta Ads.\n"
            "🥇 *Oro Premium ($2,500 MXN)*: Cobertura total 30 días + Campaña pagada prioritaria + Bot personalizado.\n\n"
            "📲 Responde *QUIERO ANUNCIAR* para coordinar con un asesor humano."
        )
        send_whatsapp_message(meta_to, respuesta)
        return

    # Regla 4: Cancelar suscripción
    if "baja" in text_lower or "cancelar" in text_lower:
        respuesta = "✅ Has sido dado de baja de la lista de difusión de Publica Navojoa. ¡Gracias por habernos acompañado!"
        send_whatsapp_message(meta_to, respuesta)
        return

    # Regla 5: Respuesta por defecto para cualquier otra consulta
    respuesta_default = (
        f"¡Hola {sender_name}! 👋 Recibimos tu mensaje en *Publica Navojoa*.\n\n"
        "Un asesor humano te responderá a la brevedad.\n\n"
        "📌 Comandos rápidos:\n"
        "- Escribe *OFERTAS* para ver el catálogo semanal.\n"
        "- Escribe *ANUNCIAR* para ver nuestros paquetes publicitarios."
    )
    send_whatsapp_message(meta_to, respuesta_default)

@app.route("/", methods=["GET"])
def home():
    return "Servidor Webhook & Bot de Respuestas Publica Navojoa Activo."

@app.route("/webhook", methods=["GET"])
def verify_webhook():
    mode = request.args.get("hub.mode")
    token = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        print("[OK] Webhook verificado con exito por Meta!")
        return challenge, 200
    else:
        print("[ERROR] Fallo de verificacion de Token:", token)
        return "Forbidden", 403

@app.route("/webhook", methods=["POST"])
def receive_webhook():
    data = request.get_json()
    print("[EVENTO] Recibido de Meta:", json.dumps(data, indent=2))

    try:
        entry = data.get("entry", [])[0]
        changes = entry.get("changes", [])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])

        if messages:
            msg = messages[0]
            contacts = value.get("contacts", [{}])[0]
            
            sender_phone = msg.get("from", "")
            clean_phone = sender_phone
            if clean_phone.startswith("521") and len(clean_phone) == 13:
                clean_phone = clean_phone[3:]
            elif clean_phone.startswith("52") and len(clean_phone) == 12:
                clean_phone = clean_phone[2:]
                
            sender_name = contacts.get("profile", {}).get("name", "Cliente WhatsApp")
            
            msg_text = ""
            if msg.get("type") == "text":
                msg_text = msg.get("text", {}).get("body", "")
            elif msg.get("type") == "button":
                msg_text = msg.get("button", {}).get("text", "")
            elif msg.get("type") == "interactive":
                interactive = msg.get("interactive", {})
                if interactive.get("type") == "button_reply":
                    msg_text = interactive.get("button_reply", {}).get("title", "")
                elif interactive.get("type") == "list_reply":
                    msg_text = interactive.get("list_reply", {}).get("title", "")

            if msg_text:
                time_str = datetime.now().strftime("%I:%M %p")
                store = load_store()
                
                new_msg = {
                    "phone": clean_phone,
                    "name": sender_name,
                    "text": msg_text,
                    "type": "incoming",
                    "time": time_str,
                    "timestamp": time.time()
                }
                store["messages"].append(new_msg)
                
                store["contacts"][clean_phone] = {
                    "name": sender_name,
                    "phone": clean_phone,
                    "last_msg": msg_text,
                    "last_time": time_str
                }
                save_store(store)
                print(f"[MENSAJE] De {sender_name} ({clean_phone}): {msg_text}")

                # EJECUTAR EL BOT AUTOMATICO EN SEGUNDO PLANO
                process_bot_rules(sender_name, clean_phone, sender_name, msg_text)

    except Exception as e:
        print("[EXCEPCION] Error procesando webhook:", str(e))

    return jsonify({"status": "success"}), 200

@app.route("/get_messages", methods=["GET"])
def get_messages():
    store = load_store()
    response = jsonify(store)
    response.headers.add("Access-Control-Allow-Origin", "*")
    return response

if __name__ == "__main__":
    print("[INFO] Iniciando Servidor Webhook & Bot de Respuestas en http://localhost:5000 ...")
    app.run(host="0.0.0.0", port=5000, debug=False)
