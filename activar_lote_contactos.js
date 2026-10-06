// Script para activar lotes diarios de contactos desde el Excel depurado
// Uso: node activar_lote_contactos.js [--limit=30] [--test=642XXXXXXX]
const openpyxl = require('child_process');
const fs = require('fs');
const path = require('path');

const META_PHONE_ID = '1280742211792981';
const META_TOKEN = 'EAAUPiVpET1YBST456Cx6ZAuNEXN8iEghj5W3msjAvZC4q8unGAcJrpeOdMBNNokantyZBcAYJS64NEx7XAV9tneN0MY6s3K2KphrgvJLzeVvpWZAvXXhDxxdMsUyQZBBaYzzDfNrcdZCFWNyaCvZBvQpyZB7wdp0m33Ytwy0uwZAN0W57js1ag6ZBAtZCNL4p2A4nRLTAZDZD';
const TEMPLATE_NAME = 'invitacion_club_vip';
const HEADER_IMAGE_URL = 'https://publicanavojoa.com/logo-compartir.png';

const BASE_DIR = __dirname;
const EXCEL_PATH = path.join(BASE_DIR, 'BASE_DE_DATOS_DEPURADA_WHATSAPP_2026.xlsx');
const PROCESSED_FILE = path.join(BASE_DIR, 'contactos_procesados.json');

// Cargar o inicializar estado de contactos procesados
function loadProcessed() {
    if (fs.existsSync(PROCESSED_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

function saveProcessed(data) {
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Extraer los siguientes N contactos del Excel usando un script auxiliar en Python
async function getNextBatchFromExcel(limit = 30) {
    const processed = loadProcessed();
    const processedPhones = Object.keys(processed);

    const pyScript = `
import openpyxl, sys, json, os

excel_path = r"${EXCEL_PATH}"
processed_phones = set(${JSON.stringify(processedPhones)})
limit = ${limit}

wb = openpyxl.load_workbook(excel_path, read_only=True)
ws = wb['Contactos WhatsApp (40k)']

batch = []
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i == 0: continue # Header
    # Row format: [ID, Nombre Completo, Primer Nombre, Celular (10), WA Int (+52), Formato Visual, Colonia, Municipio, Lada, Estado]
    if not row or len(row) < 4: continue
    
    phone = str(row[3]).strip()
    if not phone or len(phone) != 10 or phone in processed_phones:
        continue
        
    nombre = str(row[1] or 'Contacto').strip()
    primer_nombre = str(row[2] or 'Amigo(a)').strip()
    colonia = str(row[6] or 'Navojoa').strip()
    municipio = str(row[7] or 'Navojoa').strip()
    lada = str(row[8] or '642').strip()
    
    batch.append({
        'phone': phone,
        'nombre': nombre,
        'primer_nombre': primer_nombre,
        'colonia': colonia,
        'municipio': municipio,
        'lada': lada
    })
    
    if len(batch) >= limit:
        break

sys.stdout.write(json.stringify(batch))
`;

    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec(`python -c "${pyScript.replace(/\n/g, ' ')}"`, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
            if (err) {
                console.error('[EXCEL READ ERR]', stderr);
                return resolve([]);
            }
            try {
                const batch = JSON.parse(stdout.trim());
                resolve(batch);
            } catch (e) {
                console.error('[JSON PARSE ERR]', e);
                resolve([]);
            }
        });
    });
}

// Registrar en Firestore que se le envió invitación
async function registerInFirestore(contact) {
    const cleanPhone = contact.phone;
    const nowStr = new Date().toLocaleString('es-MX', { timeZone: 'America/Hermosillo' });
    
    try {
        const docUrl = `https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/contacts/${cleanPhone}`;
        await fetch(docUrl + '?updateMask.fieldPaths=nombre&updateMask.fieldPaths=colonia&updateMask.fieldPaths=municipio&updateMask.fieldPaths=opt_in&updateMask.fieldPaths=origen&updateMask.fieldPaths=fecha_invitacion', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    nombre: { stringValue: contact.nombre },
                    colonia: { stringValue: contact.colonia },
                    municipio: { stringValue: contact.municipio },
                    opt_in: { stringValue: 'Pendiente_Confirmacion' },
                    origen: { stringValue: 'Base_Depurada_2026' },
                    fecha_invitacion: { stringValue: nowStr }
                }
            })
        });
    } catch(e) {
        console.error('[FIRESTORE SAVE ERR]', e);
    }
}

async function main() {
    const args = process.argv.slice(2);
    let limit = 30;
    let testNum = '';

    args.forEach(arg => {
        if (arg.startsWith('--limit=')) limit = parseInt(arg.split('=')[1], 10) || 30;
        if (arg.startsWith('--test=')) testNum = arg.split('=')[1].replace(/\D/g, '');
    });

    console.log(`\n===============================================================`);
    console.log(`👑 ACTIVACIÓN SEGURA DE CONTACTOS • PUBLICA NAVOJOA`);
    console.log(`===============================================================`);
    console.log(`📌 Plantilla: ${TEMPLATE_NAME} (con Logotipo Institucional)`);
    console.log(`🖼️ Imagen Cabecera: ${HEADER_IMAGE_URL}`);

    // Modo Prueba
    if (testNum) {
        console.log(`\n🧪 MODO PRUEBA: Enviando invitación a +52 ${testNum}...`);
        const cleanPhone = testNum.length === 10 ? '52' + testNum : testNum;
        const payload = {
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'template',
            template: {
                name: TEMPLATE_NAME,
                language: { code: 'es_MX' },
                components: [
                    {
                        type: 'header',
                        parameters: [{ type: 'image', image: { link: HEADER_IMAGE_URL } }]
                    },
                    {
                        type: 'body',
                        parameters: [{ type: 'text', text: 'Enrique' }]
                    }
                ]
            }
        };

        const res = await fetch(`https://graph.facebook.com/v20.0/${META_PHONE_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${META_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log('Resultado de Prueba:', JSON.stringify(data, null, 2));
        return;
    }

    const processed = loadProcessed();
    console.log(`📊 Contactos previamente procesados: ${Object.keys(processed).length}`);
    console.log(`🚀 Solicitando siguiente lote de ${limit} contactos del Excel...\n`);

    const batch = await getNextBatchFromExcel(limit);
    if (batch.length === 0) {
        console.log('✅ ¡No hay más contactos pendientes por procesar en el archivo!');
        return;
    }

    console.log(`👥 Lote obtenido: ${batch.length} contactos listos para enviar:\n`);

    let okCount = 0;
    let errCount = 0;

    for (let i = 0; i < batch.length; i++) {
        const c = batch[i];
        const cleanPhone = '52' + c.phone;
        const firstName = c.primer_nombre || 'Amigo(a)';

        process.stdout.write(`[${i + 1}/${batch.length}] Enviando a ${c.nombre} (+52 ${c.phone} - ${c.colonia})... `);

        const payload = {
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'template',
            template: {
                name: TEMPLATE_NAME,
                language: { code: 'es_MX' },
                components: [
                    {
                        type: 'header',
                        parameters: [{ type: 'image', image: { link: HEADER_IMAGE_URL } }]
                    },
                    {
                        type: 'body',
                        parameters: [{ type: 'text', text: firstName }]
                    }
                ]
            }
        };

        try {
            let res = await fetch(`https://graph.facebook.com/v20.0/${META_PHONE_ID}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${META_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            let data = await res.json();

            // Fallback es
            if (data.error && (data.error.code === 132000 || data.error.code === 132001)) {
                payload.template.language.code = 'es';
                res = await fetch(`https://graph.facebook.com/v20.0/${META_PHONE_ID}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${META_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                data = await res.json();
            }

            if (data.error) {
                console.log(`❌ Error #${data.error.code}: ${data.error.message}`);
                errCount++;
                processed[c.phone] = {
                    date: new Date().toISOString(),
                    status: 'ERROR',
                    errorCode: data.error.code,
                    errorMsg: data.error.message,
                    nombre: c.nombre
                };
            } else {
                console.log(`✅ OK (ID: ${data.messages?.[0]?.id})`);
                okCount++;
                processed[c.phone] = {
                    date: new Date().toISOString(),
                    status: 'ENVIADO',
                    msgId: data.messages?.[0]?.id,
                    nombre: c.nombre,
                    colonia: c.colonia,
                    municipio: c.municipio
                };
                await registerInFirestore(c);
            }
        } catch (e) {
            console.log(`❌ Error de red: ${e.message}`);
            errCount++;
            processed[c.phone] = {
                date: new Date().toISOString(),
                status: 'ERROR_RED',
                errorMsg: e.message,
                nombre: c.nombre
            };
        }

        saveProcessed(processed);

        // Pausa de seguridad anti-saturación de 2.5 segundos
        await new Promise(r => setTimeout(r, 2500));
    }

    console.log(`\n===============================================================`);
    console.log(`🏁 RESUMEN DEL LOTE PROCESADO`);
    console.log(`===============================================================`);
    console.log(`✅ Enviados Exitosos: ${okCount}`);
    console.log(`❌ Errores / Descartados: ${errCount}`);
    console.log(`📈 Total Acumulado en Historial: ${Object.keys(processed).length} contactos.`);
    console.log(`💡 Para enviar el siguiente lote ejecuta: node activar_lote_contactos.js --limit=30\n`);
}

if (require.main === module) {
    main();
}
