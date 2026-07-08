# ADR 003 — PGVector for Vector Search

## Status

Accepted (implemented)

---

## Context

RAG pipeline membutuhkan vector storage untuk menyimpan embedding teks (1024-dim) dari paper ilmiah dan melakukan similarity search untuk mengambil konteks yang relevan saat LLM generation.

Alternatif: dedicated vector database (Pinecone, Weaviate, Milvus, Qdrant). Ditolak karena: menambah infrastruktur terpisah, biaya tambahan, overkill untuk skala MVP.

Alternatif: in-memory vector search (faiss-node, hnswlib). Ditolak karena: tidak persistent, harus rebuild saat restart, tidak scalable.

Alternatif: Redis vector search (RediSearch). Ditolak karena: menambah dependensi Redis module, tidak semua Redis hosting support.

---

## Decision

Gunakan PGVector — PostgreSQL extension untuk vector operations:
- Vector type: `vector(1024)` — di-manage via raw SQL (Prisma tidak support natively)
- Index: IVFFlat (default PGVector index) — tidak di-setup eksplisit di migration, bisa ditambahkan untuk performa
- Similarity: cosine distance (`<=>`) via raw SQL query di `vectorStore.ts`
- Embedding column: ditambahkan manual via `ALTER TABLE document_chunks ADD COLUMN embedding vector(1024)`
- Chunk embeddings: disimpan bersama metadata di `document_chunks` table

---

## Consequences

### Positive

- No additional infrastructure — PostgreSQL sudah ada
- Persistent — embedding survive restart
- Transactional — embedding dan metadata dalam satu DB
- Simple deployment — satu Docker image (`pgvector/pgvector:pg14`)
- Prisma untuk metadata, raw SQL untuk vector ops

### Trade-offs

- Raw SQL untuk semua vector operations — Prisma tidak bisa type-check
- `$executeRawUnsafe` — dimensi di-interpolasi langsung (aman karena input internal number 1024)
- Performa IVFFlat < HNSW untuk dataset sangat besar — tapi cukup untuk <1M vectors
- No ANN index yet — bisa ditambahkan nanti

### Risks

- SQL injection risk di `$executeRawUnsafe` jika dimensi dari user input → mitigasi: validasi input sebagai finite number
- PGVector extension harus di-install manual di database production (Neon, Supabase, dll)
