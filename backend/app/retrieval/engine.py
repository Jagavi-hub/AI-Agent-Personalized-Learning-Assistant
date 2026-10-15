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

    def extract_topics_from_text(self, pages: List[Tuple[int, str]], filename: str) -> List[str]:
        """Extract structured key academic topics from document text and headings."""
        fn_lower = filename.lower()
        full_text = " ".join([text for _, text in pages])
        full_text_lower = full_text.lower()
        
        extracted = []

        # Course-specific signature topic detection from syllabus content
        if re.search(r'(^|\b)(ml|machine)', fn_lower):
            candidates = [
                ("Learning Definition & Core Principles", ["learning is the process", "gaining knowledge", "experience"]),
                ("Supervised Learning", ["supervised", "labeled data", "classification", "regression"]),
                ("Unsupervised Learning", ["unsupervised", "clustering", "unlabeled", "patterns"]),
                ("Reinforcement Learning", ["reinforcement", "agent", "reward", "penalty", "action"]),
                ("Well-Posed Learning Problems (T, P, E)", ["well-posed", "task t", "performance measure", "experience e"]),
                ("Designing a Learning System", ["designing a learning system", "target function", "representation"]),
                ("Perspectives & Issues in Machine Learning", ["perspectives", "issues in machine learning", "generalization"]),
            ]
            for topic_name, keywords in candidates:
                if any(k in full_text_lower for k in keywords):
                    extracted.append(topic_name)

        elif re.search(r'(^|\b)(ai|intelligence)', fn_lower):
            candidates = [
                ("Definitions & Overview of AI", ["artificial intelligence", "simulation of human intelligence", "thinking"]),
                ("The Turing Test & Operational Intelligence", ["turing test", "alan turing", "interrogator", "imitation"]),
                ("Thinking Humanly vs Thinking Rationally", ["thinking humanly", "thinking rationally", "laws of thought", "cognitive"]),
                ("Acting Humanly vs Acting Rationally", ["acting humanly", "acting rationally", "rational agent"]),
                ("Rational Agents & PEAS Framework", ["rational agent", "peas", "performance measure", "environment", "actuators", "sensors"]),
                ("Agent Structures & Environments", ["simple reflex", "model-based", "goal-based", "utility", "learning agent"]),
            ]
            for topic_name, keywords in candidates:
                if any(k in full_text_lower for k in keywords):
                    extracted.append(topic_name)

        elif re.search(r'(^|\b)(cn|network)', fn_lower):
            candidates = [
                ("Data Communications & Core Criteria", ["data communications", "exchange of data", "transmission medium"]),
                ("Components of Data Communication Systems", ["components", "sender", "receiver", "message", "protocol"]),
                ("Data Flow Modes (Simplex, Half-Duplex, Full-Duplex)", ["simplex", "half-duplex", "full-duplex", "direction of flow"]),
                ("Network Performance, Reliability & Security", ["performance", "throughput", "transit time", "reliability", "security"]),
                ("Physical Topologies (Mesh, Star, Bus, Ring)", ["topology", "mesh", "star", "bus", "ring", "point-to-point"]),
                ("Categories of Networks (LAN, MAN, WAN)", ["local area network", "lan", "wide area network", "wan", "internet"]),
            ]
            for topic_name, keywords in candidates:
                if any(k in full_text_lower for k in keywords):
                    extracted.append(topic_name)

        elif re.search(r'(^|\b)(cc|cloud)', fn_lower):
            candidates = [
                ("Introduction & Evolution of Cloud Computing", ["cloud computing", "virtualization", "on-demand", "infrastructure"]),
                ("NIST Five Essential Cloud Characteristics", ["on-demand self-service", "broad network access", "resource pooling", "rapid elasticity", "measured service"]),
                ("Cloud Service Models (IaaS, PaaS, SaaS)", ["iaas", "paas", "saas", "infrastructure as a service", "software as a service"]),
                ("Cloud Deployment Models (Public, Private, Hybrid)", ["public cloud", "private cloud", "hybrid cloud", "community cloud"]),
                ("Shared Responsibility Model & Security", ["shared responsibility", "security", "cloud benefits", "scalability"]),
            ]
            for topic_name, keywords in candidates:
                if any(k in full_text_lower for k in keywords):
                    extracted.append(topic_name)

        elif re.search(r'(^|\b)(bd|big data|hadoop|spark|analytics)', fn_lower):
            candidates = [
                ("Big Data Characteristics (5 V's)", ["volume", "velocity", "variety", "veracity", "value"]),
                ("Hadoop Ecosystem & HDFS Architecture", ["hadoop", "hdfs", "namenode", "datanode", "distributed file system"]),
                ("MapReduce Computational Model", ["mapreduce", "mapper", "reducer", "shuffle", "key-value"]),
                ("Distributed Processing with Apache Spark", ["spark", "rdd", "resilient distributed", "spark sql", "dataframes"]),
                ("NoSQL Data Stores & Key-Value DBs", ["nosql", "hbase", "cassandra", "mongodb", "key-value"]),
                ("Data Streaming & Analytics Pipelines", ["streaming", "kafka", "flume", "batch processing", "real-time analytics"]),
            ]
            for topic_name, keywords in candidates:
                if any(k in full_text_lower for k in keywords):
                    extracted.append(topic_name)

        # Fallback heuristic: detect headings from lines starting with numbers or uppercase
        if not extracted:
            for _, text in pages:
                lines = text.split("\n")
                for line in lines:
                    line_clean = line.strip()
                    if re.match(r'^(TOPIC|UNIT|[0-9]+\.)\s+[A-Z\s]{4,40}$', line_clean):
                        title_case = line_clean.title()
                        if title_case not in extracted and len(title_case) > 5:
                            extracted.append(title_case)
                    if len(extracted) >= 5:
                        break
                if len(extracted) >= 5:
                    break

        if not extracted:
            extracted = ["Foundational Principles", "Architectural Overview", "Key Implementations & Concepts"]

        return extracted[:6]

    def process_and_store_document(
        self,
        db: Session,
        student_id: int,
        filename: str,
        file_path: Path,
        file_size: int,
        file_type: str,
        subject_id: Optional[int] = None
    ) -> KnowledgeDocument:
        """Extract text, create chunks, extract topics, and persist document record."""
        import json

        # 1. Extract text per page
        if file_type == "pdf":
            pages = self.extract_text_from_pdf(file_path)
        else:
            pages = self.extract_text_from_txt(file_path)

        # 2. Extract key academic topics
        topics_list = self.extract_topics_from_text(pages, filename)

        # 3. Create document entry
        doc = KnowledgeDocument(
            student_id=student_id,
            subject_id=subject_id,
            filename=filename,
            file_path=str(file_path),
            file_size=file_size,
            file_type=file_type,
            extracted_topics=json.dumps(topics_list),
            status="processing"
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        try:
            # 4. Create chunks
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
        subject_id: Optional[int] = None,
        document_id: Optional[int] = None,
        top_k: int = 3,
        threshold: float = 0.01
    ) -> List[Dict[str, Any]]:
        """
        Semantic retrieval across uploaded document chunks.
        Uses TF-IDF vector similarity with cosine distance and optional course/document filtering.
        """
        if not query.strip():
            return []

        # Retrieve chunks from DB with optional course/document filtering
        chunk_query = db.query(DocumentChunk, KnowledgeDocument).join(
            KnowledgeDocument, DocumentChunk.document_id == KnowledgeDocument.id
        ).filter(KnowledgeDocument.status == "processed")

        if document_id is not None:
            chunk_query = chunk_query.filter(KnowledgeDocument.id == document_id)
        elif subject_id is not None:
            chunk_query = chunk_query.filter(KnowledgeDocument.subject_id == subject_id)

        records = chunk_query.all()
        if not records and (subject_id is not None or document_id is not None):
            # If no chunks found for specific subject or document, do not mix unrelated course content!
            return []
        
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
                        "subject_id": doc_obj.subject_id,
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
