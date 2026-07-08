# Pipeline — Steps

| Step | File | Function | Input | Output | Notes |
|------|------|----------|-------|--------|-------|
| Crawl | `pipeline/crawler.ts` | `fetchMultipleTopics(topics)` | Topic strings | Parsed arXiv papers | Fetch via arXiv API, parse XML via xml2js, timeout 5s |
| Clean | `pipeline/cleaner.ts` | `cleanAndDeduplicate(docs)` | Raw documents | Cleaned documents | Remove LaTeX, HTML, normalize whitespace |
| Chunk | `pipeline/chunker.ts` | `chunkDocuments(docs)` | Cleaned documents | Text chunks | Split by paragraph, estimate tokens, overlap configurable |
| Embed | `pipeline/embedder.ts` | `embedBatch(chunks)` | Text chunks | Vectors (1024-dim) | NVIDIA NIM embed API (`nv-embedqa-e5-v5`) |
| Vector Store | `pipeline/vectorStore.ts` | `insertChunksWithEmbeddings(chunks)` | Chunks + vectors | PGVector rows | Raw SQL insert, `$executeRawUnsafe` for vector type |
| Retrieve | `pipeline/retriever.ts` | `retrieve(topics, topK)` | Query topics | Relevant chunks + citations | Cosine similarity via PGVector, `buildCitations()` |
| Generate | `services/aiGenerator.ts` | `generateWithRAG(context, options)` | Retrieved context | Raw knowledge cards (JSON) | NVIDIA NIM LLM, token-aware truncation, fuzzy domain matching, JSON parse via regex |
| Fact Check | `pipeline/factChecker.ts` | `factCheckCard(card)` | Generated card | Verification result | CrossRef + PubMed API, `saveFactCheckResults()` |
| Moderate | `pipeline/moderator.ts` | `moderateCard(card)` | Card | Moderation result (approved/review/blocked) | Blacklist keywords, review keywords, content length, domain validation |
| Publish | `pipeline/publisher.ts` | `publishCard(card, factCheck, moderation, sources)` | Moderated card | KnowledgeCard DB row | Domain validation, content dedup (title+content exact match), citation dedup, cache invalidation |

**Orchestrator**: `queue/workers/pipelineWorker.ts:executePipeline()` — runs all steps sequentially, updates `PipelineJob` progress in DB, calls progress callback.

**CLI entry**: `workers/contentGenerator.ts` — `npm run generate` command, supports `simple` mode (without RAG context).
