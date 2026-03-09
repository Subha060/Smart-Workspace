
import PyPDF2
import docx as python_docx
from .base import generate


# Text Extraction 

def extract_from_pdf(file) -> str:
    try:
        reader = PyPDF2.PdfReader(file)
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages)
    except Exception as e:
        raise ValueError(f"Could not read PDF: {e}")


def extract_from_docx(file) -> str:
    try:
        doc = python_docx.Document(file)
        return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
    except Exception as e:
        raise ValueError(f"Could not read DOCX: {e}")


def extract_from_txt(file) -> str:
    try:
        return file.read().decode('utf-8', errors='ignore')
    except Exception as e:
        raise ValueError(f"Could not read TXT: {e}")

# Auto-detect file type and extract text.

def extract_text(uploaded_file) -> str:
    name = uploaded_file.name.lower()
    if name.endswith('.pdf'):
        return extract_from_pdf(uploaded_file)
    elif name.endswith('.docx') or name.endswith('.doc'):
        return extract_from_docx(uploaded_file)
    elif name.endswith('.txt'):
        return extract_from_txt(uploaded_file)
    else:
        raise ValueError("Unsupported file type. Please upload PDF, DOCX, or TXT.")


# Summarization 
def summarize(text: str, format: str = 'bullets', length: str = 'medium', api_key: str = None, model_name: str = 'gemini-2.5-flash') -> str:
    
    # Trim to avoid token overload
    text = text[:8000]

    length_map = {
        'short':  '3-5 key points only',
        'medium': '8-10 key points',
        'long':   '15+ detailed points covering everything important',
    }
    format_map = {
        'bullets':   'bullet points (use • for each point)',
        'paragraph': '2-4 well-structured paragraphs',
        'tldr':      'a TL;DR one-liner first, then detailed bullet points',
    }

    prompt = f"""You are a professional document analyst. Summarize the document below.

FORMAT: {format_map.get(format, 'bullet points')}
LENGTH: {length_map.get(length, '8-10 key points')}

Also include at the end:
• **Main Topic**: (one sentence)
• **Key Takeaways**: (2-3 lines)
• **Action Items**: (if any are mentioned)

---DOCUMENT START---
{text}
---DOCUMENT END---

Provide only the summary, no preamble:"""

    return generate(prompt, api_key=api_key, model_name=model_name)