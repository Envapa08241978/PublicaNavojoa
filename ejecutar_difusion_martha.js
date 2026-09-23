// Script oficial para ejecutar o diagnosticar la difusión de Martha Avendaño
const META_PHONE_ID = '1280742211792981';
const META_TOKEN = 'EAAUPiVpET1YBST456Cx6ZAuNEXN8iEghj5W3msjAvZC4q8unGAcJrpeOdMBNNokantyZBcAYJS64NEx7XAV9tneN0MY6s3K2KphrgvJLzeVvpWZAvXXhDxxdMsUyQZBBaYzzDfNrcdZCFWNyaCvZBvQpyZB7wdp0m33Ytwy0uwZAN0W57js1ag6ZBAtZCNL4p2A4nRLTAZDZD';
const TEMPLATE_NAME = 'martha_avendano_salon';
const HEADER_IMAGE_URL = 'https://iili.io/nopsdYJ.jpg';

function diagnoseError(err) {
    if (!err) return 'Error desconocido';
    const code = err.code || 0;
    const subcode = err.error_subcode || 0;
    const msg = (err.message || '').toLowerCase();
    
    if (code === 131050 || subcode === 131050 || msg.includes('131050') || msg.includes('opted out')) {
        return '🚫 Error 131050: El usuario desactivó la recepción de marketing (Opt-Out en WhatsApp).';
    }
    if (code === 131026 || subcode === 131026) {
        return '⏳ Error 131026: Fuera de ventana de 24 horas o plantilla no aprobada.';
    }
    if (code === 131000 || code === 131005 || code === 131056) {
        return '📵 Error 131000: El número de teléfono no tiene cuenta activa en WhatsApp.';
    }
    return `⚠️ Error #${code}${subcode ? ' (Sub #' + subcode + ')' : ''}: ${err.message || ''}`;
}

async function fetchContacts() {
    const res = await fetch('https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents:runQuery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            structuredQuery: {
                from: [{ collectionId: 'contacts' }]
            }
        })
    });
    const data = await res.json();
    const contacts = [];
    data.forEach(item => {
        const doc = item.document;
        if (!doc) return;
        const f = doc.fields || {};
        const phone = doc.name.split('/').pop().replace(/\D/g, '');
        const optIn = f.opt_in?.stringValue || 'Autorizado';
        const mktStatus = f.marketing_status?.stringValue || '';
        const nombre = f.nombre?.stringValue || 'Cliente';

        if (optIn !== 'No' && mktStatus !== 'opt_out') {
            contacts.push({ phone, nombre });
        }
    });
    return contacts;
}

async function main() {
    console.log(`\n======================================================`);
    console.log(`🚀 DIFUSIÓN META CLOUD API — ${TEMPLATE_NAME}`);
    console.log(`======================================================\n`);
    
    const contacts = await fetchContacts();
    console.log(`👥 Total de contactos válidos con Opt-in: ${contacts.length}\n`);

    const results = [];

    for (let i = 0; i < contacts.length; i++) {
        const c = contacts[i];
        const cleanPhone = c.phone.length === 10 ? '52' + c.phone : c.phone;
        const firstName = c.nombre.split(' ')[0] || 'Amigo';

        process.stdout.write(`[${i + 1}/${contacts.length}] Enviando a ${c.nombre} (+52 ${c.phone})... `);

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

            if (data.error) {
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
                const diag = diagnoseError(data.error);
                console.log(`❌ FALLÓ: ${diag}`);
                results.push({ phone: c.phone, nombre: c.nombre, status: 'ERROR', diag, raw: data.error.message });
            } else {
                console.log(`✅ OK (ID: ${data.messages?.[0]?.id})`);
                results.push({ phone: c.phone, nombre: c.nombre, status: 'SUCCESS', diag: 'Entregado a Meta', raw: '' });
            }
        } catch (e) {
            console.log(`❌ Error de red: ${e.message}`);
            results.push({ phone: c.phone, nombre: c.nombre, status: 'ERROR', diag: e.message, raw: e.message });
        }

        await new Promise(r => setTimeout(r, 600));
    }

    console.log(`\n======================================================`);
    console.log(`🏁 RESUMEN DEL ENVÍO`);
    console.log(`======================================================`);
    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    const errorList = results.filter(r => r.status === 'ERROR');
    console.log(`✅ Exitosos: ${successCount}`);
    console.log(`❌ Fallidos: ${errorList.length}`);

    if (errorList.length > 0) {
        console.log(`\n📋 DETALLE DE NÚMEROS QUE NO SE ENVIARON Y SUS RAZONES:`);
        errorList.forEach((e, idx) => {
            console.log(`${idx + 1}. +52 ${e.phone} (${e.nombre}) -> ${e.diag}`);
        });
    }
}

if (require.main === module) {
    main();
}
