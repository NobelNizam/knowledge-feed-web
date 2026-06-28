require('dotenv').config();
const { embedText } = require('./src/pipeline/embedder');
const { searchSimilar } = require('./src/pipeline/vectorStore');

async function test() {
  const query = "quantum computing";
  const embedding = await embedText(query);
  const results = await searchSimilar(embedding, 5, 2.0);
  console.log("Results found:", results.length);
  results.forEach(r => console.log("ID:", r.id, "Distance:", r.distance, "Source:", r.source_title));
}
test().catch(console.error);
