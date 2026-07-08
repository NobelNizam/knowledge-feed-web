# Integrations

Dokumentasi third-party APIs yang digunakan oleh Knowledge Feed Web.

| Service | File | Purpose |
|---------|------|---------|
| NVIDIA NIM | [nvidia-nim.md](./nvidia-nim.md) | LLM inference (Llama 3.1 70B) + text embedding (1024-dim) |
| arXiv API | [arxiv.md](./arxiv.md) | Scientific paper metadata fetching (RAG pipeline source) |
| CrossRef API | — (inline in `factChecker.ts`) | Claim verification via DOI lookup |
| PubMed API | — (inline in `factChecker.ts`) | Claim verification via NCBI E-utilities |
