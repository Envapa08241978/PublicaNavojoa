import openpyxl
import os
import sys
import json
import time
import requests

META_PHONE_ID = '1280742211792981'
META_TOKEN = 'EAAUPiVpET1YBST456Cx6ZAuNEXN8iEghj5W3msjAvZC4q8unGAcJrpeOdMBNNokantyZBcAYJS64NEx7XAV9tneN0MY6s3K2KphrgvJLzeVvpWZAvXXhDxxdMsUyQZBBaYzzDfNrcdZCFWNyaCvZBvQpyZB7wdp0m33Ytwy0uwZAN0W57js1ag6ZBAtZCNL4p2A4nRLTAZDZD'
TEMPLATE_NAME = 'invitacion_club_vip'
HEADER_IMAGE_URL = 'https://publicanavojoa.com/logo-compartir.png'

BASE_DIR = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA"
EXCEL_PATH = os.path.join(BASE_DIR, "BASE_DE_DATOS_DEPURADA_WHATSAPP_2026.xlsx")
PROCESSED_FILE = os.path.join(BASE_DIR, "contactos_procesados.json")

def load_processed():
    if os.path.exists(PROCESSED_FILE):
        try:
            with open(PROCESSED_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_processed(data):
    with open(PROCESSED_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def register_firestore(contact):
    clean_phone = contact['phone']
    now_str = time.strftime('%d/%m/%Y, %I:%M:%S %p')
    doc_url = f"https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/contacts/{clean_phone}"
    
    payload = {
        "fields": {
            "nombre": {"stringValue": contact['nombre']},
            "colonia": {"stringValue": contact['colonia']},
            "municipio": {"stringValue": contact['municipio']},
            "opt_in": {"stringValue": "Pendiente_Confirmacion"},
            "origen": {"stringValue": "Base_Depurada_2026"},
            "fecha_invitacion": {"stringValue": now_str}
        }
    }
    try:
        url = doc_url + "?updateMask.fieldPaths=nombre&updateMask.fieldPaths=colonia&updateMask.fieldPaths=municipio&updateMask.fieldPaths=opt_in&updateMask.fieldPaths=origen&updateMask.fieldPaths=fecha_invitacion"
        requests.patch(url, json=payload, timeout=5)
    except Exception:
        pass

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    limit = 30
    for arg in sys.argv[1:]:
        if arg.startswith('--limit='):
            try: limit = int(arg.split('=')[1])
            except: limit = 30

    print("\n" + "="*65)
    print("👑 ACTIVACIÓN SEGURA DE CONTACTOS • PUBLICA NAVOJOA")
    print("="*65)
    print(f"📌 Plantilla: {TEMPLATE_NAME} (con Logotipo Institucional)")
    print(f"🖼️ Imagen Cabecera: {HEADER_IMAGE_URL}")

    processed = load_processed()
    print(f"📊 Contactos previamente procesados: {len(processed)}")
    print(f"🚀 Leyendo siguiente lote de {limit} contactos del Excel...\n")

    if not os.path.exists(EXCEL_PATH):
        print("❌ Error: No se encontró el archivo Excel depurado.")
        return

    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True)
    ws = wb['Contactos WhatsApp (40k)']

    batch = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0 or not row or len(row) < 4:
            continue
        phone = str(row[3]).strip() if row[3] is not None else ''
        if not phone or len(phone) != 10 or phone in processed:
            continue
        batch.append({
            'phone': phone,
            'nombre': str(row[1] or 'Contacto').strip(),
            'primer_nombre': str(row[2] or 'Amigo(a)').strip(),
            'colonia': str(row[6] or 'Navojoa').strip(),
            'municipio': str(row[7] or 'Navojoa').strip(),
            'lada': str(row[8] or '642').strip()
        })
        if len(batch) >= limit:
            break

    if not batch:
        print("✅ ¡No hay más contactos pendientes por procesar en el archivo!")
        return

    print(f"👥 Lote obtenido: {len(batch)} contactos listos para enviar:\n")

    ok_count = 0
    err_count = 0

    for idx, c in enumerate(batch, 1):
        clean_phone = '52' + c['phone']
        first_name = c['primer_nombre']
        print(f"[{idx}/{len(batch)}] Enviando a {c['nombre']} (+52 {c['phone']} - {c['colonia']})... ", end='', flush=True)

        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "template",
            "template": {
                "name": TEMPLATE_NAME,
                "language": {"code": "es_MX"},
                "components": [
                    {
                        "type": "header",
                        "parameters": [{"type": "image", "image": {"link": HEADER_IMAGE_URL}}]
                    },
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": first_name}]
                    }
                ]
            }
        }

        try:
            res = requests.post(
                f"https://graph.facebook.com/v20.0/{META_PHONE_ID}/messages",
                headers={
                    "Authorization": f"Bearer {META_TOKEN}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=10
            )
            data = res.json()

            if "error" in data and data["error"].get("code") in [132000, 132001]:
                payload["template"]["language"]["code"] = "es"
                res = requests.post(
                    f"https://graph.facebook.com/v20.0/{META_PHONE_ID}/messages",
                    headers={"Authorization": f"Bearer {META_TOKEN}", "Content-Type": "application/json"},
                    json=payload,
                    timeout=10
                )
                data = res.json()

            if "error" in data:
                err = data["error"]
                print(f"❌ Error #{err.get('code')}: {err.get('message')}")
                err_count += 1
                processed[c['phone']] = {
                    "date": time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                    "status": "ERROR",
                    "errorCode": err.get("code"),
                    "errorMsg": err.get("message"),
                    "nombre": c['nombre']
                }
            else:
                msg_id = data.get("messages", [{}])[0].get("id", "N/A")
                print(f"✅ OK (ID: {msg_id})")
                ok_count += 1
                processed[c['phone']] = {
                    "date": time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                    "status": "ENVIADO",
                    "msgId": msg_id,
                    "nombre": c['nombre'],
                    "colonia": c['colonia'],
                    "municipio": c['municipio']
                }
                register_firestore(c)
        except Exception as e:
            print(f"❌ Error de red: {e}")
            err_count += 1
            processed[c['phone']] = {
                "date": time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                "status": "ERROR_RED",
                "errorMsg": str(e),
                "nombre": c['nombre']
            }

        save_processed(processed)
        time.sleep(2.5) # Pausa de seguridad anti-spam

    print("\n" + "="*65)
    print("🏁 RESUMEN DEL LOTE PROCESADO")
    print("="*65)
    print(f"✅ Enviados Exitosos: {ok_count}")
    print(f"❌ Errores / Descartados: {err_count}")
    print(f"📈 Total Acumulado en Historial: {len(processed)} contactos.")
    print("💡 Para enviar el siguiente lote ejecuta: node activar_lote_contactos.js --limit=30\n")

if __name__ == "__main__":
    main()
