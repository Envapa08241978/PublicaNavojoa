import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

BASE_DIR = r"c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA"

# Institutional Palette: Guinda, Oro y Verde WhatsApp
C_PRIMARY = colors.HexColor("#6B1D2F")     # Guinda Institucional
C_PRIMARY_DARK = colors.HexColor("#4A1220")# Guinda Oscuro
C_SECONDARY = colors.HexColor("#B8860B")   # Oro / Dorado Elegante
C_GOLD_LIGHT = colors.HexColor("#FEF9C3")  # Oro muy claro
C_TEXT_MAIN = colors.HexColor("#0F172A")   # Slate 900
C_TEXT_MUTED = colors.HexColor("#475569")  # Slate 600
C_BG_CARD = colors.HexColor("#F8FAFC")     # Fondo Gris Perla
C_BG_LIGHT = colors.HexColor("#FFFFFF")
C_GREEN = colors.HexColor("#16A34A")       # Verde WhatsApp
C_GREEN_LIGHT = colors.HexColor("#DCFCE7")
C_BORDER = colors.HexColor("#E2E8F0")

def generate_charts():
    plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
    plt.rcParams['font.family'] = 'sans-serif'
    
    # -------------------------------------------------------------
    # Gráfica 1: Embudo WhatsApp & Rendimiento
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(4.8, 2.3), dpi=300)
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#F8FAFC')
    
    stages = ['Enviados VIP', 'Entregados', 'Leidos (65.6%)', 'Consultas Bot']
    values = [125, 120, 82, 34]
    bar_colors = ['#6B1D2F', '#8B263E', '#16A34A', '#D97706']
    
    bars = ax.barh(stages[::-1], values[::-1], color=bar_colors[::-1], height=0.55, edgecolor='none', zorder=3)
    ax.grid(axis='x', linestyle='--', alpha=0.5, color='#CBD5E1', zorder=0)
    
    for bar in bars:
        w = bar.get_width()
        ax.text(w + 2.5, bar.get_y() + bar.get_height()/2, f'{int(w)}', 
                va='center', ha='left', fontsize=9, fontweight='bold', color='#0F172A')
        
    ax.set_xlim(0, 150)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#94A3B8')
    ax.spines['bottom'].set_color('#94A3B8')
    ax.tick_params(axis='y', labelsize=8.5, colors='#1E293B')
    ax.tick_params(axis='x', labelsize=8, colors='#64748B')
    ax.set_title('Embudo de Interaccion WhatsApp (Directo y Bot)', fontsize=10, fontweight='bold', color='#6B1D2F', pad=8)
    
    plt.tight_layout()
    chart1_path = os.path.join(BASE_DIR, "chart_whatsapp_funnel.png")
    plt.savefig(chart1_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
    plt.close()
    
    # -------------------------------------------------------------
    # Gráfica 2: Interacciones en Facebook (+81,100 miembros)
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(4.8, 2.3), dpi=300)
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#F8FAFC')
    
    categories = ['Reacciones\n(28 Likes / 14 Love)', 'Veces\nCompartido', 'Comentarios\nGenerados']
    counts = [42, 38, 18]
    colors_list = ['#1D4ED8', '#16A34A', '#D97706']
    
    bars = ax.bar(categories, counts, color=colors_list, width=0.45, edgecolor='none', zorder=3)
    ax.grid(axis='y', linestyle='--', alpha=0.5, color='#CBD5E1', zorder=0)
    
    for bar in bars:
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2, h + 1.2, f'{int(h)}', 
                ha='center', va='bottom', fontsize=9, fontweight='bold', color='#0F172A')
        
    ax.set_ylim(0, 52)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#94A3B8')
    ax.spines['bottom'].set_color('#94A3B8')
    ax.tick_params(axis='x', labelsize=8.5, colors='#1E293B')
    ax.tick_params(axis='y', labelsize=8, colors='#64748B')
    ax.set_title('Desglose de Interaccion en FB (+81,100 miembros)', fontsize=10, fontweight='bold', color='#6B1D2F', pad=8)
    
    plt.tight_layout()
    chart2_path = os.path.join(BASE_DIR, "chart_facebook_impact.png")
    plt.savefig(chart2_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
    plt.close()

    # -------------------------------------------------------------
    # Gráfica 3: Comparativa de Costo por Persona en Navojoa (MXN)
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(4.8, 2.1), dpi=300)
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#F8FAFC')
    
    medios = ['Publica Navojoa\n(Tarifa Regular $600)', 'Volantes Impresos\n(Reparto local)', 'Radio Local\n(Spot 20 seg)', 'Perifoneo\n(Por colonia)']
    costos = [0.07, 1.80, 4.20, 2.50]
    col_medios = ['#16A34A', '#94A3B8', '#64748B', '#475569']
    
    bars = ax.barh(medios[::-1], costos[::-1], color=col_medios[::-1], height=0.52, zorder=3)
    ax.grid(axis='x', linestyle='--', alpha=0.5, color='#CBD5E1', zorder=0)
    
    for bar in bars:
        w = bar.get_width()
        val_str = f"${w:.2f} MXN" if w >= 0.1 else f"${w:.2f} MXN (7 centavos)"
        ax.text(w + 0.1, bar.get_y() + bar.get_height()/2, val_str, 
                va='center', ha='left', fontsize=8, fontweight='bold', 
                color='#16A34A' if w < 0.1 else '#1E293B')
        
    ax.set_xlim(0, 5.0)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#94A3B8')
    ax.spines['bottom'].set_color('#94A3B8')
    ax.tick_params(axis='y', labelsize=8, colors='#1E293B')
    ax.tick_params(axis='x', labelsize=8, colors='#64748B')
    ax.set_title('Comparativa: Costo por Persona en Navojoa', fontsize=9.5, fontweight='bold', color='#6B1D2F', pad=6)
    
    plt.tight_layout()
    chart3_path = os.path.join(BASE_DIR, "chart_cost_comparison.png")
    plt.savefig(chart3_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
    plt.close()

    return chart1_path, chart2_path, chart3_path


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Barra superior decorativa institucional
        self.setFillColor(C_PRIMARY)
        self.rect(0, 782, 612, 10, fill=1, stroke=0)
        self.setFillColor(C_SECONDARY)
        self.rect(0, 779, 612, 3, fill=1, stroke=0)
        
        # Barra inferior decorativa
        self.setFillColor(C_BORDER)
        self.rect(36, 38, 540, 0.75, fill=1, stroke=0)
        
        # Pie de página institucional
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(C_PRIMARY)
        self.drawString(36, 24, "PUBLICA NAVOJOA")
        
        self.setFont("Helvetica", 7.5)
        self.setFillColor(C_TEXT_MUTED)
        self.drawString(135, 24, "• Ecosistema Comercial & Difusion Directa • publicanavojoa.com")
        
        contact_txt = "Asesora Comercial: Monica Obregon • WhatsApp: +52 647 482 0862"
        self.drawRightString(576, 24, contact_txt)
        
        page_str = f"Pagina {self._pageNumber} de {page_count}"
        self.drawRightString(576, 12, page_str)
        
        self.restoreState()


def build_pdf_report():
    chart1, chart2, chart3 = generate_charts()
    pdf_filename = os.path.join(BASE_DIR, "REPORTE_RENDIMIENTO_MB_STORE.pdf")
    
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=38,
        bottomMargin=44
    )
    
    styles = getSampleStyleSheet()
    
    style_title = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=C_PRIMARY,
        alignment=TA_LEFT
    )
    
    style_subtitle = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=C_TEXT_MUTED,
        alignment=TA_LEFT
    )
    
    style_section_h = ParagraphStyle(
        'SectionH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13,
        textColor=C_PRIMARY,
        spaceBefore=5,
        spaceAfter=3
    )

    style_card_title = ParagraphStyle(
        'CardTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=C_TEXT_MUTED,
        alignment=TA_CENTER
    )

    style_card_val = ParagraphStyle(
        'CardVal',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13.5,
        leading=15,
        textColor=C_PRIMARY,
        alignment=TA_CENTER
    )
    
    style_card_sub = ParagraphStyle(
        'CardSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=6.5,
        leading=8,
        textColor=C_GREEN,
        alignment=TA_CENTER
    )

    style_body = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=C_TEXT_MAIN,
        alignment=TA_JUSTIFY
    )

    style_bold_body = ParagraphStyle(
        'BodyBoldCustom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=C_TEXT_MAIN
    )

    style_badge = ParagraphStyle(
        'BadgeStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=C_GREEN,
        alignment=TA_RIGHT
    )

    story = []

    # =============================================================
    # PÁGINA 1: ENCABEZADO Y MÉTRICAS
    # =============================================================
    logo_path = os.path.join(BASE_DIR, "Publica navojoa logotipo oficial.png")
    logo_img = Image(logo_path, width=1.5*inch, height=0.55*inch) if os.path.exists(logo_path) else Paragraph("<b>PUBLICA NAVOJOA</b>", style_title)
    
    header_right = [
        Paragraph("<b>INFORME EJECUTIVO DE IMPACTO PUBLICITARIO</b>", style_title),
        Spacer(1, 1),
        Paragraph("<b>Campaña Multicanal:</b> Facebook Grupo Oficial & Difusion WhatsApp Cloud VIP", style_subtitle),
        Paragraph("<b>Cliente:</b> MB STORE — Material & Uñas | <b>Orden:</b> ORD-207375 | <b>Emision:</b> Octubre 2026", style_subtitle)
    ]
    
    tbl_header = Table([[logo_img, header_right]], colWidths=[1.7*inch, 5.8*inch])
    tbl_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(tbl_header)
    story.append(HRFlowable(width="100%", thickness=1, color=C_SECONDARY, spaceAfter=6, spaceBefore=2))
    
    # Banner de Estado y Asesora
    banner_data = [
        [
            Paragraph("<b>ESTADO DE CAMPAÑA:</b> <font color='#16A34A'><b>EXITOSA / 100% COMPLETADA</b></font>", style_bold_body),
            Paragraph("<b>Asesora Comercial:</b> Monica Obregon (WhatsApp: 647 482 0862)", style_badge)
        ]
    ]
    tbl_banner = Table(banner_data, colWidths=[4.2*inch, 3.3*inch])
    tbl_banner.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_BG_CARD),
        ('BOX', (0,0), (-1,-1), 0.75, C_BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(tbl_banner)
    story.append(Spacer(1, 5))

    # 4 KPI Cards Grid
    card1 = [Paragraph("PERSONAS ALCANZADAS", style_card_title), Paragraph("8,450+", style_card_val), Paragraph("En FB (+81.1k miembros)", style_card_sub)]
    card2 = [Paragraph("TASA DE APERTURA WHATSAPP", style_card_title), Paragraph("65.6%", style_card_val), Paragraph("82 lecturas confirmadas", style_card_sub)]
    card3 = [Paragraph("CONSULTAS EN BOT 24/7", style_card_title), Paragraph("34 Leads", style_card_val), Paragraph("Busquedas 'Material Uñas'", style_card_sub)]
    card4 = [Paragraph("COSTO POR IMPACTO REAL", style_card_title), Paragraph("$0.07 MXN", style_card_val), Paragraph("7 centavos por persona", style_card_sub)]

    tbl_kpis = Table(
        [[card1, card2, card3, card4]],
        colWidths=[1.875*inch, 1.875*inch, 1.875*inch, 1.875*inch]
    )
    tbl_kpis.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_BG_CARD),
        ('BOX', (0,0), (-1,-1), 0.75, C_BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(tbl_kpis)
    story.append(Spacer(1, 6))

    # Sección 1: Desglose Multicanal
    story.append(Paragraph("1. Desglose de Rendimiento por Canal de Difusion", style_section_h))
    
    desc_p1 = (
        "La campaña publicitaria de <b>MB STORE</b> se ejecuto de forma integral en los dos canales de mayor traccion comercial de "
        "<b>Publica Navojoa</b>: 1) Fijacion destacada en el grupo oficial de Facebook (que actualmente cuenta con <b>mas de 81,100 miembros</b>) "
        "y 2) Difusion directa 1 a 1 mediante WhatsApp Cloud API a la base VIP de compradoras autorizadas."
    )
    story.append(Paragraph(desc_p1, style_body))
    story.append(Spacer(1, 4))

    # Tabla Detallada de Métricas
    metrics_table_data = [
        [
            Paragraph("<b>Canal Publicitario</b>", style_bold_body),
            Paragraph("<b>Metrica Clave</b>", style_bold_body),
            Paragraph("<b>Resultado Obtenido</b>", style_bold_body),
            Paragraph("<b>Impacto Comercial para MB STORE</b>", style_bold_body)
        ],
        [
            Paragraph("<b>Facebook Grupo Oficial</b><br/><font color='#64748B' size='6.5'>+81,100 Miembros Activos</font>", style_body),
            Paragraph("Alcance / Visualizaciones<br/>Interacciones Totales<br/>Veces Compartido", style_body),
            Paragraph("<b>8,450 personas</b><br/>98 acciones (42 reacc., 18 com.)<br/><b>38 veces compartido</b>", style_body),
            Paragraph("Maxima visibilidad en Navojoa. Difusion organica amplificada por la propia comunidad de manicuristas.", style_body)
        ],
        [
            Paragraph("<b>WhatsApp Broadcast VIP</b><br/><font color='#64748B' size='6.5'>Mensajeria Directa 1 a 1</font>", style_body),
            Paragraph("Mensajes Enviados<br/>Tasa de Entrega<br/>Lecturas Confirmadas", style_body),
            Paragraph("125 suscriptores<br/><b>96.0% entrega</b> (120)<br/><b>82 leidos (65.6%)</b>", style_body),
            Paragraph("Llegada directa al celular de clientas con boton oficial hacia el WhatsApp de ventas de MB STORE.", style_body)
        ],
        [
            Paragraph("<b>Asistente Bot 24/7</b><br/><font color='#64748B' size='6.5'>Catalogo Interactivo</font>", style_body),
            Paragraph("Consultas del Catalogo<br/>Fichas de Oferta Vistas", style_body),
            Paragraph("<b>34 consultas directas</b><br/>Keywords: Uñas, Material, Esmaltes", style_body),
            Paragraph("Recomendacion continua 24/7 para usuarias que buscan proveedores de belleza y acrilicos.", style_body)
        ]
    ]

    tbl_metrics = Table(metrics_table_data, colWidths=[1.8*inch, 1.7*inch, 1.8*inch, 2.2*inch])
    tbl_metrics.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_PRIMARY),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_BG_LIGHT, C_BG_CARD])
    ]))
    for i in range(4):
        metrics_table_data[0][i].style.textColor = colors.white
        
    story.append(tbl_metrics)
    story.append(Spacer(1, 6))

    # Gráficas 1 y 2 en paralelo
    img_chart1 = Image(chart1, width=3.65*inch, height=1.75*inch)
    img_chart2 = Image(chart2, width=3.65*inch, height=1.75*inch)
    tbl_charts = Table([[img_chart1, img_chart2]], colWidths=[3.75*inch, 3.75*inch])
    tbl_charts.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(tbl_charts)

    # Salto de página
    story.append(PageBreak())

    # =============================================================
    # PÁGINA 2: ANÁLISIS COMERCIAL, JUSTIFICACIÓN Y RENOVACIÓN
    # =============================================================
    story.append(Paragraph("2. Analisis de Crecimiento del Ecosistema Publica Navojoa", style_section_h))
    
    growth_p = (
        "El ecosistema publicitario de <b>Publica Navojoa</b> continua en expansion constante, garantizando un mayor volumen "
        "de compradoras en cada campaña:"
    )
    story.append(Paragraph(growth_p, style_body))
    story.append(Spacer(1, 3))

    # 3 Bullet Cards de Crecimiento
    b1 = Paragraph("<b>🚀 Comunidad de Facebook (+81,100 Miembros):</b> Superamos los 81,100 miembros locales activos. Toda publicacion fijada recibe ahora una exposicion masiva y sostenida frente a compradoras de Navojoa y municipios vecinos.", style_body)
    b2 = Paragraph("<b>📈 Crecimiento de +40% en WhatsApp VIP:</b> La base de contactos verificados con Opt-in crecio un <b>+40%</b>, lo que incrementa el alcance de las difusiones directas en celulares.", style_body)
    b3 = Paragraph("<b>💎 Tarifa de Lanzamiento vs. Valor Regular:</b> Su campaña inicial se ejecuto con una <b>tarifa preferencial de prueba de $300 MXN</b> (descuento del 50% de introduccion sobre el valor regular de $600 MXN). Este precio permitio validar con exito la alta efectividad del canal.", style_body)
    
    tbl_bullets = Table([[b1], [b2], [b3]], colWidths=[7.5*inch])
    tbl_bullets.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_BG_CARD),
        ('BOX', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(tbl_bullets)
    story.append(Spacer(1, 6))

    # Sección 3: Razones Estratégicas para Continuar
    story.append(Paragraph("3. Razones Estrategicas para Mantener la Publicidad Activa", style_section_h))
    
    store_img_path = os.path.join(BASE_DIR, "mb_store_navojoa.jpg")
    img_store = Image(store_img_path, width=2.3*inch, height=1.7*inch) if os.path.exists(store_img_path) else Paragraph("Foto Tienda", style_body)
    
    reasons_text = [
        Paragraph("<b>1. Ciclo de Reabastecimiento Recurrente (15 a 21 Dias):</b><br/>"
                  "Las aplicadoras de uñas y salones de belleza consumen geles, monomeros, limas y pegamentos de forma continua. "
                  "Mantener presencia regular en WhatsApp asegura que MB STORE sea su primera opcion al resurtir.", style_body),
        Spacer(1, 3),
        Paragraph("<b>2. Blindaje de Marca Frente a la Competencia:</b><br/>"
                  "El sector de insumos de belleza en Navojoa es dinamico. Mantener la publicacion fijada y la presencia en el bot 24/7 garantiza que otras tiendas no capten a sus clientas.", style_body),
        Spacer(1, 3),
        Paragraph("<b>3. Costo por Impacto Inmejorable ($0.07 MXN):</b><br/>"
                  "Con el <b>Paquete Bronce Regular ($600 MXN)</b>, cada impacto publicitario directo cuesta solo <b>7 centavos por persona</b>, rindiendo 30 a 50 veces mas que volantes o medios tradicionales.", style_body)
    ]
    
    tbl_reasons = Table([[img_store, reasons_text]], colWidths=[2.4*inch, 5.1*inch])
    tbl_reasons.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(tbl_reasons)
    story.append(Spacer(1, 6))

    # Gráfica 3 + Tabla de Planes
    img_chart3 = Image(chart3, width=3.65*inch, height=1.55*inch)
    
    plans_data = [
        [Paragraph("<b>OPCIONES DE RENOVACION DE PAQUETE</b>", style_bold_body)],
        [Paragraph("<b>📦 PAQUETE BRONCE ($600 MXN / Regular)</b><br/>"
                   "• 7 Dias de Publicacion Fijada en Grupo FB (+81,100 miembros).<br/>"
                   "• 1 Difusion Masiva por WhatsApp VIP a base activa (+40%).<br/>"
                   "• Presencia activa en el Catalogo y Asistente Bot 24/7.", style_body)],
        [Paragraph("<b>⭐ RECOMENDADO: PAQUETE PLATA ($1,200 MXN)</b><br/>"
                   "• <b>15 Dias de Fijacion</b> en la parte superior del grupo de FB.<br/>"
                   "• <b>2 Difusiones Masivas</b> por WhatsApp (quincena 1 y 2).<br/>"
                   "• Prioridad de recomendacion en el Bot para 'Material de Uñas'.", style_body)]
    ]
    tbl_plans = Table(plans_data, colWidths=[3.7*inch])
    tbl_plans.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_PRIMARY),
        ('BACKGROUND', (0,1), (-1,1), C_BG_CARD),
        ('BACKGROUND', (0,2), (-1,2), C_GOLD_LIGHT),
        ('BOX', (0,0), (-1,-1), 0.75, C_BORDER),
        ('GRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    plans_data[0][0].style.textColor = colors.white
    
    tbl_comparison_grid = Table([[img_chart3, tbl_plans]], colWidths=[3.75*inch, 3.75*inch])
    tbl_comparison_grid.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(tbl_comparison_grid)
    story.append(Spacer(1, 6))

    # Call to Action Box Final
    cta_data = [
        [
            Paragraph("<b>¡Asegura tus fechas y mantén tu liderazgo en Navojoa!</b><br/>"
                      "Para renovar tu campaña o agendar tu siguiente difusion masiva, comunicate con:<br/>"
                      "<b>Asesora Comercial: Monica Obregon</b> • WhatsApp Directo: <b>+52 647 482 0862</b> • <i>Publica Navojoa</i>", style_body)
        ]
    ]
    tbl_cta = Table(cta_data, colWidths=[7.5*inch])
    tbl_cta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_GREEN_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, C_GREEN),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(tbl_cta)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"SUCCESS: Report PDF generated at {pdf_filename}")

if __name__ == "__main__":
    build_pdf_report()
