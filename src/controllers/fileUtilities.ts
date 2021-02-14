import path from 'path';
import * as nodeDir from 'node-dir';

const imageFileExtensions = ['.jpg', '.JPG', '.jpeg', '.JPEG', '.png', '.PNG'];

const getFilesInDirectory = (rootDirPath: string) => {
  return nodeDir.files(rootDirPath, {sync:true});
}

export const getImageFiles = (rootPath: string) => {
  const imageFiles: string[] = [];
  const files = getFilesInDirectory(rootPath);
  // TEDTODO - use regex?
  for (const file of files) {
    const extension: string = path.extname(file);
    if (imageFileExtensions.includes(extension)) {
      imageFiles.push(file);
    }
  }
  return imageFiles;
}