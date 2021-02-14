import dotenv from 'dotenv';
import connectDB from './config/db';

import { runApp } from './controllers';

export let mediaItemsDir: string = '';

async function main() {

  console.log('main invoked');
  console.log(mediaItemsDir);

  dotenv.config({ path: './/src/config/config.env' });
  mediaItemsDir = process.env.MEDIA_ITEMS_DIR;
  console.log(mediaItemsDir);

  // connect to db
  await connectDB();

  runApp();
}

main();

