import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import os
import sys
import re
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA"
INPUT_FILE = os.path.join(BASE_DIR, "celulares y nombre 2024.xlsx")
OUTPUT_FILE = os.path.join(BASE_DIR, "BASE_DE_DATOS_DEPURADA_WHATSAPP_2026.xlsx")

def clean_name(raw_name):
    if not raw_name:
        return "Contacto"
    name = str(raw_name)
    name = re.sub(r'[▶►■•*\-\|\/]+', ' ', name)
    name = re.sub(r'\(\s*\d+\s*\)', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    if not name or name.isdigit() or len(name) < 2:
        return "Contacto"
    return name.title()

def get_first_name(full_name):
    if not full_name or full_name == "Contacto":
        return "Amigo(a)"
    parts = full_name.split()
    return parts[0] if parts else "Amigo(a)"

def clean_colonia(raw_col):
    if not raw_col:
        return "Navojoa Centro"
    col = str(raw_col)
    col = re.sub(r'\s+', ' ', col).strip()
    if not col or col.upper() in ['SIN COLONIA', '0', '000', 'NINGUNA', 'S/N', 'SN', 'NO', 'NONE']:
        return "Navojoa Centro"
    return col.title()

def clean_municipio(raw_mun, lada):
    if raw_mun:
        m = str(raw_mun).strip().title()
        if m.upper() not in ['SIN MUNICIPIO', '0', 'NO', 'NONE', '']:
            return m
    # Fallback por lada
    if lada == '642':
        return 'Navojoa'
    elif lada == '644':
        return 'Ciudad Obregón'
    elif lada == '647':
        return 'Álamos / Huatabampo'
    elif lada == '662':
        return 'Hermosillo'
    elif lada == '631':
        return 'Nogales'
    elif lada == '622':
        return 'Guaymas'
    return 'Navojoa'

def is_valid_mexican_cell(digits):
    if len(digits) != 10:
        return False
    # No puede empezar con 0 o 1 en México
    if digits[0] in ['0', '1']:
        return False
    # No puede tener todos los mismos dígitos
    if len(set(digits)) <= 2:
        return False
    if digits in ['1234567890', '0123456789', '9876543210', '0000000000']:
        return False
    return True

def process_and_save():
    print(f"📖 Leyendo archivo original: {INPUT_FILE} ...")
    wb_in = openpyxl.load_workbook(INPUT_FILE, read_only=True)
    ws_in = wb_in['Sheet1']

    cleaned_dict = {}
    discarded = {
        'total_filas_original': 0,
        'vacios_o_longitud_invalida': 0,
        'falsos_o_dummies': 0,
        'duplicados_eliminados': 0
    }

    lada_stats = Counter()
    mun_stats = Counter()

    for i, row in enumerate(ws_in.iter_rows(values_only=True)):
        discarded['total_filas_original'] += 1
        if i < 5: # Filas de encabezado original
            continue
        
        raw_name = row[0]
        raw_col = row[4] if len(row) > 4 else ''
        raw_mun = row[6] if len(row) > 6 else ''
        raw_cel = str(row[7]) if len(row) > 7 and row[7] is not None else ''

        digits = re.sub(r'\D', '', raw_cel)
        if len(digits) == 12 and digits.startswith('52'):
            digits = digits[2:]
        elif len(digits) == 11 and digits.startswith('1'):
            digits = digits[1:]
            
        if not digits or len(digits) != 10:
            discarded['vacios_o_longitud_invalida'] += 1
            continue
            
        if not is_valid_mexican_cell(digits):
            discarded['falsos_o_dummies'] += 1
            continue
            
        if digits in cleaned_dict:
            discarded['duplicados_eliminados'] += 1
            continue
            
        name = clean_name(raw_name)
        first_name = get_first_name(name)
        lada = digits[:3]
        colonia = clean_colonia(raw_col)
        municipio = clean_municipio(raw_mun, lada)
        
        cleaned_dict[digits] = {
            'nombre': name,
            'primer_nombre': first_name,
            'celular': digits,
            'wa_internacional': '+52' + digits,
            'formato_visual': '+52 ' + digits[:3] + ' ' + digits[3:6] + ' ' + digits[6:],
            'colonia': colonia,
            'municipio': municipio,
            'lada': lada
        }

        lada_stats[lada] += 1
        mun_stats[municipio] += 1

    total_valid = len(cleaned_dict)
    print(f"\n✅ Depuración Completada:")
    print(f"   • Total Registros Válidos y Únicos: {total_valid:,}")
    print(f"   • Teléfonos Vacíos o Incompletos: {discarded['vacios_o_longitud_invalida']:,}")
    print(f"   • Teléfonos Falsos / Dummies: {discarded['falsos_o_dummies']:,}")
    print(f"   • Duplicados Eliminados: {discarded['duplicados_eliminados']:,}")

    # Crear nuevo libro de Excel con formato profesional
    print("\n📝 Creando libro de Excel depurado...")
    wb_out = openpyxl.Workbook()
    
    # ---------------------------------------------------------
    # HOJA 1: Base Depurada
    # ---------------------------------------------------------
    ws1 = wb_out.active
    ws1.title = "Contactos WhatsApp (40k)"

    # Estilos
    font_header = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    fill_header = PatternFill(start_color="16A34A", end_color="16A34A", fill_type="solid") # Verde WhatsApp
    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    border_thin = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    headers = [
        "ID",
        "Nombre Completo",
        "Primer Nombre (Variables WhatsApp)",
        "Celular (10 Dígitos)",
        "WhatsApp Internacional (+52)",
        "Formato Visual",
        "Colonia / Sector",
        "Municipio / Región",
        "Lada",
        "Estado Contacto"
    ]
    ws1.append(headers)

    for col_num in range(1, len(headers) + 1):
        cell = ws1.cell(row=1, column=col_num)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = align_center

    ws1.row_dimensions[1].height = 28

    fill_even = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    font_data = Font(name="Arial", size=9)

    print("   -> Insertando registros en hoja principal...")
    for idx, (phone, rec) in enumerate(cleaned_dict.items(), start=1):
        row_data = [
            idx,
            rec['nombre'],
            rec['primer_nombre'],
            rec['celular'],
            rec['wa_internacional'],
            rec['formato_visual'],
            rec['colonia'],
            rec['municipio'],
            rec['lada'],
            "Listo para Difusión"
        ]
        ws1.append(row_data)

    # ---------------------------------------------------------
    # HOJA 2: Resumen y Auditoría de Depuración
    # ---------------------------------------------------------
    ws2 = wb_out.create_sheet(title="Resumen de Auditoría")
    
    fill_dark = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    fill_gold = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
    font_title = Font(name="Arial", size=14, bold=True, color="0F172A")
    font_subtitle = Font(name="Arial", size=10, italic=True, color="475569")
    
    ws2['A1'] = "PUBLICA NAVOJOA — AUDITORÍA Y DEPURACIÓN DE BASE DE DATOS"
    ws2['A1'].font = font_title
    ws2['A2'] = "Proceso de normalización técnica, eliminación de duplicados y validación para WhatsApp Cloud API"
    ws2['A2'].font = font_subtitle
    
    ws2['A4'] = "MÉTRICA DE DEPURACIÓN"
    ws2['B4'] = "CANTIDAD DE REGISTROS"
    ws2['C4'] = "% SOBRE EL TOTAL"
    for col in ['A4', 'B4', 'C4']:
        ws2[col].font = font_header
        ws2[col].fill = fill_dark
        ws2[col].alignment = align_center

    total_orig = discarded['total_filas_original']
    audit_rows = [
        ("Total de Filas en Archivo Original", total_orig, "100.0%"),
        ("(-) Teléfonos Vacíos o Longitud Inválida (<10 o >12 dígitos)", discarded['vacios_o_longitud_invalida'], f"{discarded['vacios_o_longitud_invalida']/total_orig*100:.1f}%"),
        ("(-) Teléfonos Falsos / Dummies (0000000000, patrones inválidos)", discarded['falsos_o_dummies'], f"{discarded['falsos_o_dummies']/total_orig*100:.1f}%"),
        ("(-) Duplicados Eliminados (Un solo registro único por celular)", discarded['duplicados_eliminados'], f"{discarded['duplicados_eliminados']/total_orig*100:.1f}%"),
        ("(=) TOTAL BASE LIMPIA Y VÁLIDA PARA WHATSAPP", total_valid, f"{total_valid/total_orig*100:.1f}%")
    ]

    for r_idx, (m, val, pct) in enumerate(audit_rows, start=5):
        ws2.cell(row=r_idx, column=1, value=m)
        ws2.cell(row=r_idx, column=2, value=val)
        ws2.cell(row=r_idx, column=3, value=pct)
        if r_idx == 9:
            ws2.cell(row=r_idx, column=1).font = Font(name="Arial", size=10, bold=True, color="16A34A")
            ws2.cell(row=r_idx, column=2).font = Font(name="Arial", size=10, bold=True, color="16A34A")
            ws2.cell(row=r_idx, column=3).font = Font(name="Arial", size=10, bold=True, color="16A34A")
            ws2.cell(row=r_idx, column=1).fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
            ws2.cell(row=r_idx, column=2).fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
            ws2.cell(row=r_idx, column=3).fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")

    # Tabla Ladas
    ws2['A12'] = "LADA TELEFÓNICA"
    ws2['B12'] = "REGIÓN / CIUDAD"
    ws2['C12'] = "CONTACTOS LIMPIOS"
    ws2['D12'] = "% PARTICIPACIÓN"
    for col in ['A12', 'B12', 'C12', 'D12']:
        ws2[col].font = font_header
        ws2[col].fill = fill_dark
        ws2[col].alignment = align_center

    top_ladas = lada_stats.most_common(12)
    for r_idx, (lada, cnt) in enumerate(top_ladas, start=13):
        region = clean_municipio('', lada)
        pct = f"{cnt/total_valid*100:.1f}%"
        ws2.cell(row=r_idx, column=1, value=f"Lada {lada}")
        ws2.cell(row=r_idx, column=2, value=region)
        ws2.cell(row=r_idx, column=3, value=cnt)
        ws2.cell(row=r_idx, column=4, value=pct)

    # Autoajustar anchos de columnas
    for ws in [ws1, ws2]:
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col[:100])
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    print(f"💾 Guardando archivo depurado en: {OUTPUT_FILE} ...")
    wb_out.save(OUTPUT_FILE)
    print("🎉 ¡Proceso terminado con éxito!")

if __name__ == "__main__":
    process_and_save()
