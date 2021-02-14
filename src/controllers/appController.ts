import { getImageFilesInDirectory } from './fileUtilities';

import { mediaItemsDir } from '../app';

export const runApp = () => {
  const imageFiles = getImageFilesInDirectory(mediaItemsDir);
  console.log(imageFiles);
}