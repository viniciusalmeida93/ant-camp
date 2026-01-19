
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const filePath = resolve('public', 'logohorizontal.webp');
const fileBuffer = readFileSync(filePath);
const base64 = fileBuffer.toString('base64');
const dataUri = `data:image/webp;base64,${base64}`;
writeFileSync('base64.txt', dataUri, 'utf8');
console.log('Saved to base64.txt');
