import dotenv from 'dotenv';
import { AuthService, AuthStorage } from './auth';
import connectDB from './config/db';

import { runApp } from './controllers';
import { GooglePhotos } from './GooglePhotos';

export let mediaItemsDir: string = '';

async function main() {

  console.log('main invoked');
  console.log(mediaItemsDir);

  dotenv.config({ path: './/src/config/config.env' });
  mediaItemsDir = process.env.MEDIA_ITEMS_DIR;
  console.log(mediaItemsDir);

  // connect to db
  await connectDB();

  // setup authorization
  const authStorage = new AuthStorage();
  const authService = new AuthService(authStorage);

  // authenticate with google
  const scopes = [GooglePhotos.photosApiReadOnlyScope()];
  await authService.authenticate(scopes);

  runApp();
}

main();

