import os
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.routes import get_current_user
from app.models.entities import Student, KnowledgeDocument
from app.schemas.schemas import (
    PdfDocumentItem,
    PdfOutlineResponse,
    ExplainPdfRequest,
    PdfExplanationResponse,
    PdfAskRequest,
    PdfAskResponse,
)
from app.services.pdf_explainer_service import (
    pdf_explainer_service,
    check_document_access,
    generate_readable_title,
    get_document_page_count,
)

pdf_explainer_router = APIRouter(prefix="/pdf-explainer", tags=["AI PDF Explainer"])

@pdf_explainer_router.get("/documents", response_model=List[PdfDocumentItem])
def list_accessible_pdfs(
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all authorized PDFs for the current student.
    Includes personal student uploads, registered course materials, and admin-managed PDFs.
    """
    try:
        return pdf_explainer_service.list_accessible_documents(db=db, current_user=current_user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch authorized documents: {str(e)}"
        )

@pdf_explainer_router.get("/documents/{doc_id}", response_model=PdfDocumentItem)
def get_pdf_metadata(
    doc_id: int,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed metadata, processing status, and page count for a specific PDF.
    """
    try:
        return pdf_explainer_service.get_document_metadata(db=db, doc_id=doc_id, current_user=current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch document metadata: {str(e)}"
        )

@pdf_explainer_router.get("/documents/{doc_id}/view")
def view_pdf_file(
    doc_id: int,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Stream the original PDF binary inline so it can be previewed or opened in a browser tab.
    Enforces authorization check.
    """
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {doc_id} not found.")

    if not check_document_access(doc, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You do not have permission to view this document."
        )

    file_path = Path(doc.file_path)
    if not file_path.is_file():
        # Check relative or alternate upload locations
        alt_path = Path("backend") / doc.file_path
        if alt_path.is_file():
            file_path = alt_path
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Physical PDF file '{doc.filename}' not found on storage server."
            )

    safe_filename = doc.filename.replace('"', '').replace('\n', '')
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{safe_filename}"'
        }
    )

@pdf_explainer_router.get("/documents/{doc_id}/outline", response_model=PdfOutlineResponse)
def get_pdf_outline(
    doc_id: int,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Extract or derive a structured Table of Contents / Topic list for the PDF.
    Preserves authentic page ranges and chapter boundaries.
    """
    try:
        return pdf_explainer_service.get_document_outline(db=db, doc_id=doc_id, current_user=current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate document outline: {str(e)}"
        )

@pdf_explainer_router.get("/documents/{doc_id}/explanation", response_model=PdfExplanationResponse)
def get_existing_explanation(
    doc_id: int,
    mode: str = Query("complete", pattern="^(complete|topic)$"),
    topic: Optional[str] = Query(None),
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve an existing explanation from database cache if available.
    Returns 404 if no cached explanation exists.
    """
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {doc_id} not found.")

    if not check_document_access(doc, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You do not have permission to view explanations for this document."
        )

    from app.models.entities import DocumentExplanation
    import json

    query = db.query(DocumentExplanation).filter(
        DocumentExplanation.document_id == doc.id,
        DocumentExplanation.mode == mode
    )
    if mode == "topic":
        if not topic:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Topic title is required for topic mode.")
        query = query.filter(DocumentExplanation.topic_title == topic.strip())

    cached = query.first()
    if not cached:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No cached explanation found for this document and mode."
        )

    citations = json.loads(cached.citations_json) if cached.citations_json else []
    outline = json.loads(cached.outline_json) if cached.outline_json else []
    subj = doc.subject

    return {
        "document_id": doc.id,
        "filename": doc.filename,
        "readable_title": generate_readable_title(doc.filename, subj.name if subj else None),
        "course_name": subj.name if subj else None,
        "mode": cached.mode,
        "topic_title": cached.topic_title,
        "content": cached.content,
        "citations": citations,
        "provider": cached.provider,
        "outline": outline,
        "total_pages": cached.total_pages or get_document_page_count(db, doc),
        "created_at": cached.created_at,
        "is_cached": True
    }

@pdf_explainer_router.post("/documents/{doc_id}/explain", response_model=PdfExplanationResponse)
def explain_pdf_document(
    doc_id: int,
    request: ExplainPdfRequest,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate or retrieve an AI explanation for the selected PDF.
    - Mode A: 'complete' -> Full structured breakdown covering the entire PDF sequentially.
    - Mode B: 'topic' -> Deep pedagogical breakdown for a discrete chapter or topic.
    """
    try:
        if request.mode == "topic":
            if not request.topic:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Parameter 'topic' is required when mode is 'topic'."
                )
            return pdf_explainer_service.explain_topic(
                db=db,
                doc_id=doc_id,
                topic_title=request.topic,
                current_user=current_user,
                force_regenerate=request.force_regenerate
            )
        else:
            return pdf_explainer_service.explain_complete_document(
                db=db,
                doc_id=doc_id,
                current_user=current_user,
                force_regenerate=request.force_regenerate
            )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Explanation generation failed: {str(e)}"
        )

@pdf_explainer_router.post("/documents/{doc_id}/ask", response_model=PdfAskResponse)
def ask_document_question(
    doc_id: int,
    request: PdfAskRequest,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ask a targeted question strictly grounded within the selected PDF.
    Enforces document boundary isolation and returns verifiable page citations.
    """
    try:
        return pdf_explainer_service.ask_document_question(
            db=db,
            doc_id=doc_id,
            question=request.question,
            current_user=current_user
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Question answering failed: {str(e)}"
        )
