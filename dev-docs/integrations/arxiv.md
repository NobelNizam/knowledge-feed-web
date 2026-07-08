# arXiv API Integration

> **Status:** DATA FILE — Update saat ada perubahan integrasi.

---

## Service Identity

| Item | Detail |
|------|--------|
| Provider | arXiv.org (Cornell University) |
| Purpose | Fetch scientific paper metadata and abstracts for RAG pipeline |
| Docs URL | https://info.arxiv.org/help/api/ |
| SDK/Package | `xml2js` npm package (XML → JSON parsing) |

---

## Authentication

| Item | Detail |
|------|--------|
| Method | None (public API) |
| Rate Limit | Polite use — no formal limit documented |

---

## Connection

| Item | Detail |
|------|--------|
| Base URL | `http://export.arxiv.org/api/query` |
| Timeout | 5 seconds |
| Retry | None (single fetch per topic) |

---

## Endpoints Used

| Method | Endpoint | Purpose | Code Location |
|--------|----------|---------|---------------|
| GET | `/api/query?search_query=...&max_results=...` | Fetch papers by topic | `backend/src/pipeline/crawler.ts:fetchMultipleTopics()` |

---

## Query Format

```
http://export.arxiv.org/api/query?search_query=all:{topic}&start=0&max_results=5&sortBy=relevance&sortOrder=descending
```

Response: Atom XML → parsed via `xml2js` → JavaScript objects with title, authors, abstract, PDF URL, published date, category.

---

## Error Handling

| Scenario | Behavior | User Message |
|----------|----------|-------------|
| Timeout (>5s) | Skip topic, continue to next | Topic skipped in pipeline log |
| Invalid XML response | Skip topic | Error log |
| Empty results | Skip topic | "No papers found for topic X" |

**Fallback behavior**: Jika arXiv gagal untuk semua topic, pipeline menggunakan `generateKnowledgeCards` legacy (tanpa RAG context) untuk memastikan feed tidak kosong.
