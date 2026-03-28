"""Parse routes: handle home descriptions and utility bills (text + PDF)."""

import io
from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional
from PyPDF2 import PdfReader

from app.models import HomeProfile, BillData, ParseHomeRequest, ParseBillRequest
from app.services.gemini import parse_home_text, parse_bill_text

router = APIRouter()


@router.post("/parse-home-text")
async def parse_home(req: ParseHomeRequest):
    """Parse a natural-language home description into a structured profile."""
    parsed = await parse_home_text(req.text)

    # Build HomeProfile with parsed values as overrides on defaults
    defaults = HomeProfile(zip_code=req.zip_code or "90210")
    home_data = defaults.model_dump()
    home_data.update(parsed)
    if req.zip_code:
        home_data["zip_code"] = req.zip_code

    home = HomeProfile(**home_data)
    return {"home": home.model_dump(), "parsed_fields": list(parsed.keys())}


@router.post("/parse-bill-text")
async def parse_bill(req: ParseBillRequest):
    """Parse utility bill text into structured billing data."""
    parsed = await parse_bill_text(req.text)
    bill = BillData(**parsed)
    return {"bill": bill.model_dump(), "parsed_fields": list(parsed.keys())}


@router.post("/parse-bill-pdf")
async def parse_bill_pdf(file: UploadFile = File(...), zip_code: Optional[str] = Form(None)):
    """Extract text from a PDF utility bill, then parse it."""
    content = await file.read()
    reader = PdfReader(io.BytesIO(content))

    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)

    full_text = "\n".join(text_parts)

    if not full_text.strip():
        return {"error": "Could not extract text from PDF. Try pasting the bill text instead."}

    parsed = await parse_bill_text(full_text)
    bill = BillData(**parsed)
    return {
        "bill": bill.model_dump(),
        "parsed_fields": list(parsed.keys()),
        "extracted_text_preview": full_text[:500],
    }
