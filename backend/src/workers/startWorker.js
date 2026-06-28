require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { createPipelineWorker } = require('../queue/workers/pipelineWorker');

console.log('🚀 Starting Knowledge Feed Worker...');
const worker = createPipelineWorker();

process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  process.exit(0);
});
