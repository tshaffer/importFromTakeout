import dotenv from 'dotenv';
import connectDB from './config/db';

export let mediaItemsDir: string = '';

async function main() {
  console.log('main invoked');

  dotenv.config({ path: './/src/config/config.env' });

  // connect to db
  await connectDB();

}

main();

