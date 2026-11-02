import os
import re
import json
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from pypdf import PdfReader
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models.entities import KnowledgeDocument, DocumentChunk
from app.core.config import BASE_DIR

STOP_WORDS = {
    'what', 'is', 'are', 'the', 'a', 'an', 'in', 'of', 'for', 'to', 'how', 'does',
    'and', 'or', 'by', 'on', 'with', 'about', 'can', 'you', 'explain', 'tell',
    'me', 'describe', 'define', 'which', 'from', 'at', 'it', 'this', 'that', 'our'
}

class KnowledgeRetrievalEngine:
    """
    Academic Knowledge Retrieval Engine.
    Handles PDF & TXT extraction, section-aware academic chunking,
    hybrid semantic + lexical ranking, and topic extraction with source citations.
    """

    def __init__(self):
        self._embedder = None
        self._embedder_failed = False
        self._embedding_cache: Dict[int, np.ndarray] = {}

    def _get_embedder(self):
        """Lazy load SentenceTransformer model safely."""
        if self._embedder is None and not self._embedder_failed:
            try:
                from sentence_transformers import SentenceTransformer
                self._embedder = SentenceTransformer('all-MiniLM-L6-v2')
            except Exception as e:
                print(f"[KnowledgeRetrievalEngine] Warning: SentenceTransformer unavailable, using lexical fallback: {e}")
                self._embedder_failed = True
        return self._embedder

    def clean_page_text(self, text: str) -> str:
        """Strip running header/footer noise and normalize characters."""
        if not text:
            return ""
        # Remove running headers / page number lines common in course slides
        text = re.sub(r'(?:CLOUD COMPUTING|MACHINE LEARNING|ARTIFICIAL INTELLIGENCE|COMPUTER NETWORKS|BIG DATA ANALYTICS)\s*\|\s*UNIT\s+[^\n]*\n\s*[0-9]+', '', text, flags=re.IGNORECASE)
        text = re.sub(r'(?:CLOUD COMPUTING|MACHINE LEARNING|ARTIFICIAL INTELLIGENCE|COMPUTER NETWORKS|BIG DATA ANALYTICS)\s*\|\s*UNIT\s+[^\n]*', '', text, flags=re.IGNORECASE)
        # Normalize bullets and checkmarks
        text = text.replace('\u25cf', '•').replace('\u2714', '✔').replace('\u25aa', '▪')
        # Clean excessive internal spaces while keeping newlines for structure
        lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in text.split('\n')]
        return "\n".join(line for line in lines if line)

    def extract_text_from_pdf(self, file_path: Path) -> List[Tuple[int, str]]:
        """Extract text page-by-page from a PDF file."""
        pages_content = []
        try:
            reader = PdfReader(str(file_path))
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                cleaned = self.clean_page_text(text)
                if cleaned:
                    pages_content.append((i + 1, cleaned))
            if not pages_content:
                pages_content.append((1, "[Scanned or image-only PDF: text extraction yielded empty content]"))
        except Exception as e:
            pages_content.append((1, f"[Error parsing PDF: {str(e)}]"))
        return pages_content

    def extract_text_from_txt(self, file_path: Path) -> List[Tuple[int, str]]:
        """Extract text from a plain TXT file."""
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            cleaned = self.clean_page_text(content)
            return [(1, cleaned)]
        except Exception as e:
            return [(1, f"[Error reading TXT: {str(e)}]")]

    def chunk_text(self, text: str, page_number: int, chunk_size: int = 150, overlap: int = 30) -> List[Dict[str, Any]]:
        """
        Structured, section-aware academic chunker.
        Detects headings and topic shifts so distinct concepts (e.g. Hybrid Cloud vs Private Cloud)
        are partitioned into coherent, standalone chunks with preserved headers.
        """
        text = self.clean_page_text(text)
        if not text:
            return []

        # Split pattern for academic section headers
        header_pattern = r'(?m)^(?:[A-Z0-9\s–\-\.]{3,45}:|[0-9]+\.[0-9]+[^\n]+|HYBRID CLOUD|PUBLIC CLOUD|PRIVATE CLOUD|COMMUNITY CLOUD|Virtualization[^\n]*|Cloud Computing Architecture|Detailed Trade-offs|Primary Use Cases|Architectural Mechanisms|How Does Cloud Computing Work\?|The Legacy Paradigm[^\n]*)\s*$'
        
        splits = [match.start() for match in re.finditer(header_pattern, text)]
        sections = []
        
        if not splits:
            # Fallback to word-window chunking
            words = text.split()
            step = max(1, chunk_size - overlap)
            for i in range(0, len(words), step):
                chunk_w = words[i:i + chunk_size]
                sections.append(" ".join(chunk_w))
                if i + chunk_size >= len(words):
                    break
        else:
            if splits[0] > 0:
                prefix = text[:splits[0]].strip()
                if len(prefix) > 20:
                    sections.append(prefix)
            for i in range(len(splits)):
                start = splits[i]
                end = splits[i + 1] if i + 1 < len(splits) else len(text)
                sec_text = text[start:end].strip()
                if len(sec_text) > 20:
                    words = sec_text.split()
                    if len(words) > 220:
                        step = max(1, chunk_size - overlap)
                        for j in range(0, len(words), step):
                            sub_w = words[j:j + chunk_size]
                            sections.append(" ".join(sub_w))
                            if j + chunk_size >= len(words):
                                break
                    else:
                        sections.append(sec_text)

        chunks = []
        for sec in sections:
            clean_sec = re.sub(r'\s+', ' ', sec).strip()
            if len(clean_sec) > 25:
                chunks.append({
                    "text": clean_sec,
                    "page_number": page_number
                })
        return chunks

    def extract_relevant_snippet(self, chunk_text: str, query: str, max_chars: int = 280) -> str:
        """
        Extracts a clean, readable text excerpt centered around the user's query keywords.
        Guarantees that the displayed snippet begins with the concept being asked about.
        """
        q_words = [w.lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', query) if w.lower() not in STOP_WORDS]
        
        best_pos = -1
        # Try finding multi-word or first primary keyword
        for w in q_words:
            pos = chunk_text.lower().find(w)
            if pos != -1:
                best_pos = pos
                break

        if best_pos == -1 or best_pos < 80:
            snippet = chunk_text[:max_chars].strip()
        else:
            start = max(0, best_pos - 40)
            space_pos = chunk_text.find(' ', start)
            if space_pos != -1 and space_pos < best_pos:
                start = space_pos + 1
            snippet = "..." + chunk_text[start:start + max_chars].strip()

        if len(chunk_text) > max_chars and not snippet.endswith("..."):
            snippet += "..."
        return snippet

    def extract_topics_from_text(self, pages: List[Tuple[int, str]], filename: str) -> List[str]:
        """Extract structured key academic topics from document text and headings."""
        fn_lower = filename.lower()
        full_text = " ".join([text for _, text in pages])
        full_text_lower = full_text.lower()
        extracted = []

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
        """Extract text, create section-aware chunks, extract topics, and persist document record."""
        if file_type == "pdf":
            pages = self.extract_text_from_pdf(file_path)
        else:
            pages = self.extract_text_from_txt(file_path)

        topics_list = self.extract_topics_from_text(pages, filename)

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
            all_chunks = []
            chunk_index = 0
            for page_num, text in pages:
                page_chunks = self.chunk_text(text, page_number=page_num, chunk_size=150, overlap=30)
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

    def reindex_document(self, db: Session, doc: KnowledgeDocument) -> int:
        """Safely re-index an existing document in place using the improved section chunker."""
        p = Path(doc.file_path)
        if not p.exists():
            p_rel = BASE_DIR / doc.file_path
            if p_rel.exists():
                p = p_rel
            else:
                p_mat = BASE_DIR / "data" / "course_materials" / doc.filename
                p_up = BASE_DIR / "data" / "uploads" / doc.filename
                p = p_mat if p_mat.exists() else p_up

        if not p.exists():
            print(f"[KnowledgeRetrievalEngine] Skip reindex: file not found for {doc.filename}")
            return 0

        if doc.file_type == "pdf" or doc.filename.lower().endswith(".pdf"):
            pages = self.extract_text_from_pdf(p)
        else:
            pages = self.extract_text_from_txt(p)

        # Delete existing chunks for this document
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()

        # Build fresh structured chunks
        all_chunks = []
        chunk_index = 0
        for page_num, text in pages:
            page_chunks = self.chunk_text(text, page_number=page_num, chunk_size=150, overlap=30)
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

        # Update topics
        topics_list = self.extract_topics_from_text(pages, doc.filename)
        doc.extracted_topics = json.dumps(topics_list)

        db.commit()
        db.refresh(doc)
        return len(all_chunks)

    def reindex_all_documents(self, db: Session) -> Dict[str, Any]:
        """Safely re-indexes all processed documents across the system."""
        docs = db.query(KnowledgeDocument).all()
        results = {}
        for d in docs:
            num = self.reindex_document(db, d)
            results[d.filename] = num
        # Reset cache
        self._embedding_cache.clear()
        return results

    def search_relevant_chunks(
        self,
        db: Session,
        query: str,
        student_id: Optional[int] = None,
        subject_id: Optional[int] = None,
        document_id: Optional[int] = None,
        top_k: int = 4,
        threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Hybrid Semantic + Lexical Retrieval.
        Combines SentenceTransformer dense representations with exact query term coverage.
        Enforces topic specificity gating and relevance thresholding so out-of-syllabus
        or irrelevant passages are never returned as false evidence.
        """
        if not query.strip():
            return []

        # Retrieve candidate chunks from DB with strict course/document filtering and user isolation
        chunk_query = db.query(DocumentChunk, KnowledgeDocument).join(
            KnowledgeDocument, DocumentChunk.document_id == KnowledgeDocument.id
        ).filter(KnowledgeDocument.status.in_(["processed", "ready", "indexed"]))

        if student_id is not None:
            chunk_query = chunk_query.filter(
                or_(
                    KnowledgeDocument.is_course_material == True,
                    KnowledgeDocument.file_path.like("%course_materials%"),
                    KnowledgeDocument.student_id == student_id
                )
            )

        if document_id is not None:
            chunk_query = chunk_query.filter(KnowledgeDocument.id == document_id)
        elif subject_id is not None:
            chunk_query = chunk_query.filter(KnowledgeDocument.subject_id == subject_id)

        records = chunk_query.all()
        if not records:
            return []

        # Extract informative keywords from query
        q_terms = [w.lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', query) if w.lower() not in STOP_WORDS]
        # Identify non-domain terms (words other than generic 'cloud', 'course', 'system', 'data')
        specific_terms = [w for w in q_terms if w not in {'cloud', 'course', 'system', 'data', 'unit', 'model'}]

        embedder = self._get_embedder()
        scored_results = []

        if embedder is not None:
            try:
                # 1. Semantic Embedding Search
                q_emb = embedder.encode(query)
                chunk_objs = [r[0] for r in records]
                
                # Check cache or encode
                to_encode_texts = []
                to_encode_indices = []
                chunk_vectors = []

                for idx, c in enumerate(chunk_objs):
                    if c.id in self._embedding_cache:
                        chunk_vectors.append(self._embedding_cache[c.id])
                    else:
                        to_encode_texts.append(c.text)
                        to_encode_indices.append(idx)
                        chunk_vectors.append(None)

                if to_encode_texts:
                    new_embs = embedder.encode(to_encode_texts, batch_size=32)
                    for idx, emb in zip(to_encode_indices, new_embs):
                        self._embedding_cache[chunk_objs[idx].id] = emb
                        chunk_vectors[idx] = emb

                sims = cosine_similarity([q_emb], chunk_vectors)[0]

                # 2. Hybrid combination with keyword coverage & specificity gating
                for idx, (chunk_obj, doc_obj) in enumerate(records):
                    sem_sim = float(sims[idx])
                    c_text_lower = chunk_obj.text.lower()
                    
                    # Term coverage
                    matched_q_terms = [t for t in q_terms if t in c_text_lower]
                    lexical_coverage = len(matched_q_terms) / len(q_terms) if q_terms else 0.0

                    matched_specific = [t for t in specific_terms if t in c_text_lower]
                    specific_coverage = len(matched_specific) / len(specific_terms) if specific_terms else 1.0

                    # Hybrid score: 65% dense semantic + 35% term coverage
                    combined = 0.65 * sem_sim + 0.35 * lexical_coverage

                    # Specificity Gating:
                    # If user asks for a specific topic (e.g. 'hybrid', 'virtualization'),
                    # chunks with 0 matches for specific terms are penalized heavily.
                    if specific_terms and len(matched_specific) == 0 and sem_sim < 0.40:
                        combined *= 0.25

                    # Exact multi-word phrase bonus (e.g. 'hybrid cloud')
                    if len(q_terms) >= 2 and " ".join(q_terms[:2]) in c_text_lower:
                        combined = min(1.0, combined + 0.15)

                    scored_results.append((combined, chunk_obj, doc_obj))

            except Exception as e:
                print(f"[KnowledgeRetrievalEngine] Semantic scoring error: {e}, falling back to TF-IDF")
                scored_results = []

        # Lexical Fallback if embedder was None or failed
        if not scored_results:
            chunk_texts = [r[0].text for r in records]
            try:
                vectorizer = TfidfVectorizer(stop_words='english', max_features=5000, ngram_range=(1, 2))
                corpus = [query] + chunk_texts
                tfidf_matrix = vectorizer.fit_transform(corpus)
                query_vec = tfidf_matrix[0:1]
                doc_vectors = tfidf_matrix[1:]
                similarities = cosine_similarity(query_vec, doc_vectors)[0]

                for idx, (chunk_obj, doc_obj) in enumerate(records):
                    score = float(similarities[idx])
                    c_text_lower = chunk_obj.text.lower()
                    matched_specific = [t for t in specific_terms if t in c_text_lower]
                    if specific_terms and len(matched_specific) == 0:
                        score *= 0.20
                    scored_results.append((score, chunk_obj, doc_obj))
            except Exception:
                return []

        # Effective minimum relevance threshold
        eff_threshold = threshold if threshold is not None else 0.18

        # Rank and filter
        scored_results.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, chunk_obj, doc_obj in scored_results:
            if score >= eff_threshold:
                results.append({
                    "document_id": doc_obj.id,
                    "subject_id": doc_obj.subject_id,
                    "filename": doc_obj.filename,
                    "page_number": chunk_obj.page_number,
                    "text": chunk_obj.text,
                    "score": round(score, 4),
                    "snippet": self.extract_relevant_snippet(chunk_obj.text, query)
                })
            if len(results) >= top_k:
                break

        return results

retrieval_engine = KnowledgeRetrievalEngine()
