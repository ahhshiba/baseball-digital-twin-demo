// Writes the v4.2 engineering data package to ./data (not shown on the public page).
import { mkdir, writeFile } from 'node:fs/promises';
import { DATA_FILES } from '../src/datapack.js';
await mkdir('data',{recursive:true});
for(const [name,make] of Object.entries(DATA_FILES)){const text=make();await writeFile(`data/${name}`,text);console.log(`data/${name}  ${(text.length/1024).toFixed(0)} KB`)}
