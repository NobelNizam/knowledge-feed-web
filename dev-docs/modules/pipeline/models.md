# Pipeline — Models

| Model | Table | Key Fields |
|-------|-------|------------|
| KnowledgeSource | `knowledge_sources` | externalId (unique), sourceType (arxiv/pubmed/crossref), title, authors[], abstract, contentHash (SHA-256 dedup), status (fetched/cleaned/chunked/embedded) |
| DocumentChunk | `document_chunks` | sourceId (FK), chunkIndex, content, tokenCount, embedded flag, embedding via raw SQL (vector(1024)) |
| FactCheckResult | `fact_check_results` | cardId (FK), claim, verified, confidence, sourceType, sourceUrl |
| PipelineJob | `pipeline_jobs` | bullmqJobId, type, status, input (JSON), output (JSON), currentStep, progress (0-100), error |

**Relasi**:
- KnowledgeSource 1:N DocumentChunk (Cascade)
- KnowledgeCard 1:N FactCheckResult (Cascade)

**Vector store**: `embedding` column managed via raw SQL — Prisma tidak support pgvector natively. Migration manual: `ALTER TABLE document_chunks ADD COLUMN embedding vector(1024)`.
