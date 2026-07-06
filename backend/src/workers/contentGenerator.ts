/**
 * Content Generator CLI
 *
 * CLI tool untuk menjalankan AI pipeline secara manual.
 * Supports both BullMQ (async) dan direct execution (sync).
 */

import 'dotenv/config';
import path from 'path';
import { addPipelineJob } from '../queue/queueManager';
import { createPipelineJob } from '../pipeline/publisher';
import { executePipeline } from '../queue/workers/pipelineWorker';
import prisma from '../lib/prisma';

async function run() {
  const args = process.argv.slice(2);
  const command = args[0] || 'generate';

  switch (command) {
    case 'generate':
    case 'pipeline': {
      const count = parseInt(args[1]) || 5;
      const topics = args.slice(2);

      console.log(`\n🚀 Starting AI Knowledge Pipeline`);
      console.log(`   Cards to generate: ${count}`);
      console.log(`   Topics: ${topics.length > 0 ? topics.join(', ') : 'default (from .env)'}`);
      console.log('');

      try {
        const pipelineJob = await createPipelineJob({
          type: 'full_pipeline',
          input: { topics: topics.length > 0 ? topics : undefined, count },
        });

        try {
          const job = await addPipelineJob({
            topics: topics.length > 0 ? topics : undefined,
            count,
            pipelineJobId: pipelineJob.id,
          });
          console.log(`📋 Job queued: ${job.id} (pipeline: ${pipelineJob.id})`);
          console.log('   Worker will process this job asynchronously.');
          console.log('   Check status with: npm run generate status ' + pipelineJob.id);
          process.exit(0);
        } catch (queueError: any) {
          console.log('⚠️  BullMQ not available, running pipeline synchronously...\n');
        }

        const result = await executePipeline({
          topics: topics.length > 0 ? topics : undefined,
          count,
          pipelineJobId: pipelineJob.id,
        });

        console.log(`\n✅ Pipeline complete!`);
        console.log(`   Published: ${result.publishedCards.length} cards`);
        if (result.errors.length > 0) {
          console.log(`   Errors: ${result.errors.length}`);
        }
        result.publishedCards.forEach((c: any) => console.log(`   - [${c.domain}] ${c.title}`));
        process.exit(0);
      } catch (error: any) {
        console.error('\n❌ Pipeline failed:', error.message);
        process.exit(1);
      }
      break;
    }

    case 'simple': {
      const count = parseInt(args[1]) || 5;
      console.log(`\n📝 Generating ${count} cards (simple mode, no RAG)...\n`);

      try {
        const { generateKnowledgeCards } = await import('../services/aiGenerator');
        const cards = await generateKnowledgeCards(count);
        console.log(`✅ Generated ${cards.length} cards:`);
        cards.forEach((c: any) => console.log(`   - [${c.domain}] ${c.title}`));
        process.exit(0);
      } catch (error: any) {
        console.error('❌ Failed:', error.message);
        process.exit(1);
      }
      break;
    }

    case 'status': {
      const jobId = args[1];
      if (!jobId) {
        console.error('Usage: npm run generate status <jobId>');
        process.exit(1);
      }

      try {
        const job = await prisma.pipelineJob.findUnique({ where: { id: jobId } });
        console.log(`\n📋 Pipeline Job: ${job!.id}`);
        console.log(`   Status: ${job!.status}`);
        console.log(`   Step: ${job!.currentStep}`);
        console.log(`   Progress: ${job!.progress}%`);
        console.log(`   Created: ${job!.createdAt}`);
        if (job!.completedAt) console.log(`   Completed: ${job!.completedAt}`);
        if (job!.error) console.log(`   Error: ${job!.error}`);

        await prisma.$disconnect();
        process.exit(0);
      } catch (error: any) {
        console.error('❌ Failed:', error.message);
        process.exit(1);
      }
      break;
    }

    default:
      console.log(`
Usage:
  npm run generate                         # Run full RAG pipeline (default 5 cards)
  npm run generate pipeline 10             # Generate 10 cards via pipeline
  npm run generate pipeline 5 "AI" "ML"    # Generate with custom topics
  npm run generate simple 5                # Simple generation (no RAG)
  npm run generate status <jobId>          # Check pipeline job status
      `);
      process.exit(0);
  }
}

run();
