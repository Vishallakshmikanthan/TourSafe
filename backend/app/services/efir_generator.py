"""
E-FIR PDF Generator
Produces a government-style First Information Report PDF using ReportLab.
"""

import io
import logging
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


async def generate_efir_pdf(efir: Any) -> bytes:
    """
    Generate a PDF for the given EFIR record.
    Returns bytes of the PDF file.
    """
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm, mm
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import (
            SimpleDocTemplate,
            Paragraph,
            Spacer,
            Table,
            TableStyle,
            HRFlowable,
        )
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=1.5 * cm,
            bottomMargin=2 * cm,
        )

        styles = getSampleStyleSheet()
        navy = colors.HexColor("#1A3C6E")
        saffron = colors.HexColor("#FF6B00")
        green = colors.HexColor("#046A38")
        light_gray = colors.HexColor("#F5F7FA")

        # ── Custom styles ──────────────────────────────────────────────
        heading_style = ParagraphStyle(
            "Heading",
            parent=styles["Normal"],
            fontSize=18,
            textColor=navy,
            fontName="Helvetica-Bold",
            alignment=TA_CENTER,
            spaceAfter=4,
        )
        sub_heading_style = ParagraphStyle(
            "SubHeading",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.gray,
            alignment=TA_CENTER,
            spaceAfter=2,
        )
        fir_no_style = ParagraphStyle(
            "FIRNo",
            parent=styles["Normal"],
            fontSize=11,
            textColor=saffron,
            fontName="Helvetica-Bold",
            alignment=TA_CENTER,
            spaceAfter=0,
        )
        label_style = ParagraphStyle(
            "Label",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.gray,
            fontName="Helvetica",
        )
        value_style = ParagraphStyle(
            "Value",
            parent=styles["Normal"],
            fontSize=10,
            textColor=navy,
            fontName="Helvetica-Bold",
        )
        section_style = ParagraphStyle(
            "Section",
            parent=styles["Normal"],
            fontSize=11,
            textColor=white_text := colors.white,
            fontName="Helvetica-Bold",
            alignment=TA_LEFT,
        )
        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.black,
        )
        hash_style = ParagraphStyle(
            "Hash",
            parent=styles["Normal"],
            fontSize=7,
            textColor=green,
            fontName="Courier",
            wordWrap="LTR",
        )

        story = []

        # ── Header ─────────────────────────────────────────────────────
        story.append(Paragraph("🇮🇳 GOVERNMENT OF INDIA", sub_heading_style))
        story.append(Paragraph("TourSafe — Tourist Safety & Emergency Response", heading_style))
        story.append(Paragraph("Ministry of Tourism | Department of Tourist Safety", sub_heading_style))
        story.append(Spacer(1, 4 * mm))
        story.append(HRFlowable(width="100%", thickness=2, color=navy))
        story.append(Spacer(1, 3 * mm))

        fir_number = getattr(efir, "fir_number", None) or "PENDING"
        story.append(Paragraph(f"ELECTRONIC FIRST INFORMATION REPORT", heading_style))
        story.append(Paragraph(f"FIR No: {fir_number}", fir_no_style))
        story.append(Spacer(1, 6 * mm))

        # ── Section helper ──────────────────────────────────────────────
        def section_header(title: str):
            tbl = Table([[Paragraph(f"  {title}", section_style)]], colWidths=["100%"])
            tbl.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), navy),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ])
            )
            story.append(tbl)
            story.append(Spacer(1, 3 * mm))

        def detail_row(label: str, value: str):
            return [
                Paragraph(label, label_style),
                Paragraph(str(value or "—"), value_style),
            ]

        # ── Tourist Details ─────────────────────────────────────────────
        section_header("COMPLAINANT / TOURIST DETAILS")
        tourist_name = getattr(efir, "tourist_name", None) or (
            efir.tourist.full_name if hasattr(efir, "tourist") and efir.tourist else "N/A"
        )
        tourist_data = [
            detail_row("Full Name", tourist_name),
            detail_row("Passport No.", getattr(getattr(efir, "tourist", None), "passport_number", "N/A")),
            detail_row("Nationality", getattr(getattr(efir, "tourist", None), "nationality", "N/A")),
            detail_row("Contact", getattr(getattr(efir, "tourist", None), "phone", "N/A")),
        ]
        t = Table(tourist_data, colWidths=[5 * cm, 12 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), light_gray),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(t)
        story.append(Spacer(1, 5 * mm))

        # ── Incident Details ────────────────────────────────────────────
        section_header("INCIDENT DETAILS")
        incident_data = [
            detail_row("Incident Type", getattr(efir, "incident_type", "") or efir.description[:40] if efir.description else "N/A"),
            detail_row("Date & Time",
                       efir.incident_date.strftime("%d %B %Y, %H:%M hrs") if efir.incident_date else "N/A"),
            detail_row("Location", getattr(efir, "location", None) or "Refer coordinates"),
            detail_row("Zone", getattr(efir, "zone_name", None) or "N/A"),
        ]
        t2 = Table(incident_data, colWidths=[5 * cm, 12 * cm])
        t2.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), light_gray),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(t2)
        story.append(Spacer(1, 5 * mm))

        # ── Statement ───────────────────────────────────────────────────
        section_header("COMPLAINANT STATEMENT")
        story.append(Spacer(1, 2 * mm))
        story.append(Paragraph(efir.description or "No statement provided.", body_style))
        story.append(Spacer(1, 5 * mm))

        # ── Status & Metadata ───────────────────────────────────────────
        section_header("FIR STATUS & ADMINISTRATIVE DETAILS")
        status_data = [
            detail_row("Status", (efir.status or "draft").upper()),
            detail_row("Filed On", efir.created_at.strftime("%d %B %Y, %H:%M hrs") if efir.created_at else "N/A"),
            detail_row("Submitted On", efir.submitted_at.strftime("%d %B %Y, %H:%M hrs") if getattr(efir, "submitted_at", None) else "—"),
            detail_row("Authority Officer", getattr(efir, "officer_name", None) or "Pending Assignment"),
        ]
        t3 = Table(status_data, colWidths=[5 * cm, 12 * cm])
        t3.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), light_gray),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(t3)
        story.append(Spacer(1, 5 * mm))

        # ── Blockchain Verification ─────────────────────────────────────
        if getattr(efir, "blockchain_hash", None):
            section_header("BLOCKCHAIN INTEGRITY VERIFICATION")
            story.append(Spacer(1, 2 * mm))
            story.append(Paragraph("This document has been cryptographically recorded on the Polygon Amoy blockchain.", body_style))
            story.append(Spacer(1, 2 * mm))
            story.append(Paragraph(f"Transaction Hash: {efir.blockchain_hash}", hash_style))
            story.append(Paragraph("Network: Polygon Amoy Testnet (Chain ID: 80002)", label_style))
            story.append(Spacer(1, 5 * mm))

        # ── Footer ──────────────────────────────────────────────────────
        story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
        story.append(Spacer(1, 3 * mm))
        generated_at = datetime.utcnow().strftime("%d %B %Y at %H:%M UTC")
        story.append(Paragraph(
            f"Generated by TourSafe Digital E-FIR System on {generated_at}. "
            "This is a digitally generated document. For verification, scan the QR code "
            "or visit https://toursafe.gov.in/verify",
            ParagraphStyle("Footer", parent=styles["Normal"], fontSize=7, textColor=colors.gray, alignment=TA_CENTER),
        ))

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    except ImportError:
        logger.error("ReportLab is not installed. Run: pip install reportlab")
        return _fallback_pdf(efir)


def _fallback_pdf(efir: Any) -> bytes:
    """Minimal plain-text fallback if ReportLab is unavailable."""
    lines = [
        b"%PDF-1.4",
        b"% TourSafe E-FIR Fallback",
        f"FIR Number: {getattr(efir, 'fir_number', 'N/A')}".encode(),
        f"Description: {getattr(efir, 'description', '')}".encode(),
    ]
    return b"\n".join(lines)
