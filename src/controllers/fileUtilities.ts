import * as fs from 'fs';
import path from 'path';
import * as nodeDir from 'node-dir';

const imageFileExtensions = ['.jpg', '.JPG', '.jpeg', '.JPEG', '.png', '.PNG'];

const getFilesInDirectory = (rootDirPath: string) => {
  return nodeDir.files(rootDirPath, { sync: true });
}

export const getImageFilesInDirectory = (rootPath: string) => {
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

export const getFileBuffer = (filePath: string): Promise<Buffer> => {

  const buffer: Buffer = Buffer.alloc(65635);

  const fd: any = fs.openSync(filePath, 'r');
  return new Promise((resolve, reject) => {
    fs.read(fd, buffer, 0, buffer.length, 0, (err, bytes) => {
      if (err) {
        console.log(err);
        return reject(err);
      } else {
        fs.close(fd, function (err) {
          if (err) {
            console.log(err);
            return reject(err);
          }
        });
        return resolve(buffer);
      }
    })
  })
}