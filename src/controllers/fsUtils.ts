import fs from 'fs';
import path from 'path';

import * as nodeDir from 'node-dir';
import crypto from 'crypto';

const imageFileExtensions = ['.jpg', '.JPG', '.jpeg', '.JPEG', '.png', '.PNG'];

const getFilesInDirectory = (rootDirPath: string) => {
  return nodeDir.files(rootDirPath, { sync: true });
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

export const getFileSha1 = (filePath: string): Promise<string> => {
  const hash = crypto.createHash('sha1');
  const input = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    input.on('readable', () => {
      const data = input.read();
      if (data)
        hash.update(data);
      else {
        return resolve(hash.digest('hex'));
      }
    });
  });
}

export const getStringSha1 = (str: string): string => {
  const hash = crypto.createHash('sha1');
  hash.update(str);
  return hash.digest('hex');
}

export const getShardedDirectory = (rootDirPath: string, uniqueId: string): string => {
  const numChars = uniqueId.length;
  const targetDirectory = path.join(
    rootDirPath,
    uniqueId.charAt(numChars - 2),
    uniqueId.charAt(numChars - 1),
  );
  return targetDirectory;
};

export const getFilePath = (rootDirPath: string, uniqueId: string): string => {
  const dirPath = getShardedDirectory(uniqueId, rootDirPath);
  return path.join(dirPath, uniqueId);
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
  });
}
