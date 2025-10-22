import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('TAXONOMY_REFERENCE.json', 'utf-8'));

console.log('Taxonomy counts:');
Object.keys(data).forEach(k => {
  console.log(`  ${k}: ${data[k]?.length || 0}`);
});
