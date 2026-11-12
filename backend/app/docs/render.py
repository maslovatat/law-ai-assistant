"""Экспорт текста документа в DOCX и PDF."""
import io
from xml.sax.saxutils import escape
from ..config import settings

def parse_blocks(content: str) -> list[tuple[str, str]]:
    blocks = []
    for line in content.splitlines():
        if not line.strip():
            if blocks and blocks[-1][0] == "right":
                blocks.append(("gap", ""))
            continue
        if line.startswith("> "):
            blocks.append(("right", line[2:].strip()))
        elif line.startswith("# "):
            blocks.append(("title", line[2:].strip()))
        elif line.startswith("## "):
            blocks.append(("sub", line[3:].strip()))
        else:
            blocks.append(("p", line.strip()))
    return blocks

def to_docx(content: str, footer: str | None = None) -> bytes:
    import docx
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Pt
    d = docx.Document()
    st = d.styles["Normal"]; st.font.name = "Times New Roman"; st.font.size = Pt(12)
    for kind, text in parse_blocks(content):
        if kind == "gap":
            d.add_paragraph().paragraph_format.space_after = Pt(0)
        elif kind == "right":
            p = d.add_paragraph(text); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT; p.paragraph_format.space_after = Pt(0)
        elif kind == "title":
            p = d.add_paragraph(); r = p.add_run(text); r.bold = True; r.font.size = Pt(16); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(18)
        elif kind == "sub":
            p = d.add_paragraph(); r = p.add_run(text); r.bold = True; p.paragraph_format.space_before = Pt(10)
            if text.startswith("о ") or text.startswith("об "):
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        else:
            p = d.add_paragraph(text); p.paragraph_format.space_after = Pt(4)
    if footer:
        p = d.add_paragraph(); p.paragraph_format.space_before = Pt(24)
        r = p.add_run(footer); r.italic = True; r.font.size = Pt(9)
    buf = io.BytesIO(); d.save(buf)
    return buf.getvalue()

_fonts_ready = False
def _fonts():
    global _fonts_ready
    if _fonts_ready:
        return
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    pdfmetrics.registerFont(TTFont("DJ", str(settings.fonts_dir / "DejaVuSerif.ttf")))
    pdfmetrics.registerFont(TTFont("DJ-B", str(settings.fonts_dir / "DejaVuSerif-Bold.ttf")))
    _fonts_ready = True

def to_pdf(content: str, footer: str | None = None) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    _fonts()
    base = ParagraphStyle("b", fontName="DJ", fontSize=10.5, leading=15, spaceAfter=4)
    sty = {"p": base, "right": ParagraphStyle("r", parent=base, alignment=2, spaceAfter=0),
           "title": ParagraphStyle("t", parent=base, fontName="DJ-B", fontSize=16, alignment=1, spaceBefore=14, spaceAfter=6, leading=20),
           "sub": ParagraphStyle("s", parent=base, fontName="DJ-B", spaceBefore=8)}
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=22*mm, rightMargin=18*mm, topMargin=18*mm, bottomMargin=18*mm,
                            title="Документ", author="AI Legal Assistant (демо)")
    sub_c = ParagraphStyle("sc", parent=sty["sub"], alignment=1)
    story = [Spacer(1, 12) if k == "gap" else Paragraph(escape(t), sub_c if (k == "sub" and t.startswith(("о ", "об "))) else sty[k]) for k, t in parse_blocks(content)]
    if footer:
        story += [Spacer(1, 14), Paragraph(escape(footer), ParagraphStyle("f", parent=base, fontSize=8, leading=11, textColor="#444444"))]
    doc.build(story)
    return buf.getvalue()
