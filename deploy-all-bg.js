import { spawn } from 'child_process';
import fs from 'fs';

const out = fs.openSync('./out.log', 'a');
const err = fs.openSync('./out.log', 'a');

const p = spawn('npx', ['tsx', 'run-deploy.js'], {
  detached: true,
  stdio: ['ignore', out, err]
});

p.unref();

console.log('Sequential background deployment launched!');
