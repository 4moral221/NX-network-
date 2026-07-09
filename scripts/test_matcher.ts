import * as dotenv from 'dotenv';
dotenv.config();

import { matchProduct } from '../src/services/skuMatcher';

async function run() {
  const q = "pembe2kg*10";
  console.log(`Query: ${q}`);
  const result = await matchProduct(q);
  console.log(JSON.stringify(result, null, 2));
}

run();
