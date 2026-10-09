// Sincronizar todos los contactos enviados válidos a Firestore como Autorizados
const fs = require('fs');
const path = require('path');

const PROCESSED_FILE = path.join(__dirname, 'contactos_procesados.json');

function isDummyPhone(phone) {
    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) return true;
    if (phone.startsWith('0') || phone.startsWith('1')) return true;
    if (/(\d)\1{3,}/.test(phone)) return true; // ej: 7777777809, 0000, 1111
    if (new Set(phone).size < 4) return true;
    if (['1234567890', '0123456789', '9876543210'].includes(phone)) return true;
    return false;
}

async function syncToFirestore() {
    if (!fs.existsSync(PROCESSED_FILE)) {
        console.log('No existe contactos_procesados.json');
        return;
    }

    const processed = JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8'));
    const phoneKeys = Object.keys(processed);

    console.log(`\n===============================================================`);
    console.log(`🔄 SINCRONIZACIÓN DE CONTACTOS ENVIADOS A FIRESTORE`);
    console.log(`===============================================================`);
    console.log(`Total registros en historial: ${phoneKeys.length}\n`);

    let uploaded = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < phoneKeys.length; i++) {
        const phone = phoneKeys[i];
        const item = processed[phone];

        // Omitir si hubo error en el envío o es número dummy
        if (item.status !== 'ENVIADO') {
            console.log(`[-] Omitiendo ${phone} (Estado: ${item.status})`);
            skipped++;
            continue;
        }

        if (isDummyPhone(phone)) {
            console.log(`[-] Omitiendo número inválido / dummy: ${phone}`);
            skipped++;
            continue;
        }

        const cleanPhone = phone;
        const nombre = item.nombre || 'Contacto VIP';
        const colonia = item.colonia || 'Navojoa';
        const municipio = item.municipio || 'Navojoa';
        const nowStr = item.date ? new Date(item.date).toLocaleString('es-MX', { timeZone: 'America/Hermosillo' }) : new Date().toLocaleString('es-MX', { timeZone: 'America/Hermosillo' });

        try {
            // Verificar si el contacto ya existe y si pidió baja previa
            const checkUrl = `https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/contacts/${cleanPhone}`;
            const checkRes = await fetch(checkUrl);
            if (checkRes.ok) {
                const docData = await checkRes.json();
                const currentOptIn = docData.fields?.opt_in?.stringValue;
                const marketingStatus = docData.fields?.marketing_status?.stringValue;
                if (currentOptIn === 'No' || marketingStatus === 'opt_out') {
                    console.log(`[-] Omitiendo ${cleanPhone} (${nombre}) porque solicitó baja.`);
                    skipped++;
                    continue;
                }
            }

            // Subir / actualizar en Firestore
            const docUrl = `https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/contacts/${cleanPhone}`;
            const patchRes = await fetch(docUrl + '?updateMask.fieldPaths=nombre&updateMask.fieldPaths=colonia&updateMask.fieldPaths=municipio&updateMask.fieldPaths=whatsapp&updateMask.fieldPaths=opt_in&updateMask.fieldPaths=marketing_status&updateMask.fieldPaths=origen&updateMask.fieldPaths=fecha_invitacion', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fields: {
                        nombre: { stringValue: nombre },
                        colonia: { stringValue: colonia },
                        municipio: { stringValue: municipio },
                        whatsapp: { stringValue: cleanPhone },
                        opt_in: { stringValue: 'Autorizado' },
                        marketing_status: { stringValue: 'active' },
                        origen: { stringValue: 'Base_Depurada_2026' },
                        fecha_invitacion: { stringValue: nowStr }
                    }
                })
            });

            if (patchRes.ok) {
                uploaded++;
                process.stdout.write(`[+] Sincronizado [${uploaded}]: ${nombre} (+52 ${cleanPhone} - ${colonia})\n`);
            } else {
                errors++;
                console.error(`[!] Error al subir ${cleanPhone}: ${patchRes.statusText}`);
            }
        } catch(e) {
            errors++;
            console.error(`[!] Error de red en ${cleanPhone}: ${e.message}`);
        }

        // Pequeña pausa para no saturar Firestore
        await new Promise(r => setTimeout(r, 60));
    }

    console.log(`\n===============================================================`);
    console.log(`🏁 RESULTADOS DE SINCRONIZACIÓN`);
    console.log(`===============================================================`);
    console.log(`✅ Contactos Subidos / Actualizados como Autorizados: ${uploaded}`);
    console.log(`⏭️ Omitidos (Dummies / Bajas / Errores previos): ${skipped}`);
    console.log(`❌ Errores de API: ${errors}\n`);
}

syncToFirestore();
