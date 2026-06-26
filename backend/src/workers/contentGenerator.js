require('dotenv').config();
const { generateKnowledgeCards } = require('../services/aiGenerator');

async function run() {
  console.log('Generating knowledge cards via CLI...');
  try {
    const args = process.argv.slice(2);
    const count = parseInt(args[0]) || 5;
    
    const cards = await generateKnowledgeCards(count);
    console.log(`Successfully generated ${cards.length} cards:`);
    cards.forEach(c => console.log(`- [${c.domain}] ${c.title}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Failed to generate cards:', error);
    process.exit(1);
  }
}

run();
