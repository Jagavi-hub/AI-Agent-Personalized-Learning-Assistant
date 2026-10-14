import os
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from pypdf import PdfReader
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from sqlalchemy.orm import Session
from app.models.entities import KnowledgeDocument, DocumentChunk

class KnowledgeRetrievalEngine:
    """
    Academic Knowledge Retrieval Engine.
    Handles PDF & TXT extraction, chunking with overlap and page tracking,
    and semantic relevance scoring with source citations.
    """

    def extract_text_from_pdf(self, file_path: Path) -> List[Tuple[int, str]]:
        """Extract text page-by-page from a PDF file."""
        pages_content = []
        try:
            reader = PdfReader(str(file_path))
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                # Clean up excessive whitespace
                cleaned = re.sub(r'\s+', ' ', text).strip()
                if cleaned:
                    pages_content.append((i + 1, cleaned))
            if not pages_content:
                # Scanned or image-only PDF fallback
                pages_content.append((1, "[Scanned or image-only PDF: text extraction yielded empty content]"))
        except Exception as e:
            pages_content.append((1, f"[Error parsing PDF: {str(e)}]"))
        return pages_content

    def extract_text_from_txt(self, file_path: Path) -> List[Tuple[int, str]]:
        """Extract text from a plain TXT file."""
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            cleaned = re.sub(r'\s+', ' ', content).strip()
            return [(1, cleaned)]
        except Exception as e:
            return [(1, f"[Error reading TXT: {str(e)}]")]

    def chunk_text(self, text: str, page_number: int, chunk_size: int = 500, overlap: int = 100) -> List[Dict[str, Any]]:
        """Split text into manageable chunks with overlap."""
        if not text:
            return []
        
        words = text.split()
        if not words:
            return []
            
        chunks = []
        i = 0
        while i < len(words):
            chunk_words = words[i:i + chunk_size]
            chunk_text = " ".join(chunk_words)
            chunks.append({
                "text": chunk_text,
                "page_number": page_number
            })
            if i + chunk_size >= len(words):
                break
            i += (chunk_size - overlap)
        return chunks

    def process_and_store_document(
        self,
        db: Session,
        student_id: int,
        filename: str,
        file_path: Path,
        file_size: int,
        file_type: str
    ) -> KnowledgeDocument:
        """Extract text, create chunks, and persist document record."""
        # 1. Create document entry
        doc = KnowledgeDocument(
            student_id=student_id,
            filename=filename,
            file_path=str(file_path),
            file_size=file_size,
            file_type=file_type,
            status="processing"
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        try:
            # 2. Extract text per page
            if file_type == "pdf":
                pages = self.extract_text_from_pdf(file_path)
            else:
                pages = self.extract_text_from_txt(file_path)

            # 3. Create chunks
            all_chunks = []
            chunk_index = 0
            for page_num, text in pages:
                page_chunks = self.chunk_text(text, page_number=page_num, chunk_size=300, overlap=50)
                for c in page_chunks:
                    chunk_record = DocumentChunk(
                        document_id=doc.id,
                        chunk_index=chunk_index,
                        text=c["text"],
                        page_number=c["page_number"]
                    )
                    all_chunks.append(chunk_record)
                    chunk_index += 1

            if all_chunks:
                db.bulk_save_objects(all_chunks)
                doc.num_chunks = len(all_chunks)
                doc.status = "processed"
            else:
                doc.num_chunks = 0
                doc.status = "empty"

            db.commit()
            db.refresh(doc)
            return doc
        except Exception as e:
            doc.status = "failed"
            db.commit()
            raise e

    def search_relevant_chunks(
        self,
        db: Session,
        query: str,
        student_id: Optional[int] = None,
        top_k: int = 3,
        threshold: float = 0.05
    ) -> List[Dict[str, Any]]:
        """
        Semantic retrieval across uploaded document chunks.
        Uses TF-IDF vector similarity with cosine distance.
        """
        if not query.strip():
            return []

        # Retrieve chunks from DB
        chunk_query = db.query(DocumentChunk, KnowledgeDocument).join(
            KnowledgeDocument, DocumentChunk.document_id == KnowledgeDocument.id
        )
        if student_id:
            chunk_query = chunk_query.filter(KnowledgeDocument.student_id == student_id)
        
        records = chunk_query.all()
        if not records:
            return []

        chunk_texts = [r[0].text for r in records]
        
        try:
            # Fit vectorizer on query + corpus
            vectorizer = TfidfVectorizer(stop_words='english', max_features=5000, ngram_range=(1, 2))
            corpus = [query] + chunk_texts
            tfidf_matrix = vectorizer.fit_transform(corpus)
            
            # Query vector is at index 0
            query_vec = tfidf_matrix[0:1]
            doc_vectors = tfidf_matrix[1:]
            
            similarities = cosine_similarity(query_vec, doc_vectors)[0]
            
            # Rank top-k
            top_indices = np.argsort(similarities)[::-1]
            
            results = []
            for idx in top_indices:
                score = float(similarities[idx])
                if score >= threshold:
                    chunk_obj, doc_obj = records[idx]
                    results.append({
                        "document_id": doc_obj.id,
                        "filename": doc_obj.filename,
                        "page_number": chunk_obj.page_number,
                        "text": chunk_obj.text,
                        "score": round(score, 4)
                    })
                if len(results) >= top_k:
                    break

            return results
        except Exception:
            return []

retrieval_engine = KnowledgeRetrievalEngine()
