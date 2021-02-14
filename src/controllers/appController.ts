import {
  getFileBuffer,
  getImageFilesInDirectory,
} from './fileUtilities';

import { ExifParserFactory } from "ts-exif-parser";

// var ExifImage = require('exif').ExifImage;

import { mediaItemsDir } from '../app';


export const runApp = async () => {
  const imageFiles = getImageFilesInDirectory(mediaItemsDir);
  console.log(imageFiles);

  const filePath = '/Volumes/SHAFFEROTO/takeout/unzipped/Takeout 15/Google Photos/Photos from 2020/IMG_4464.JPG';

  // try {
  //   new ExifImage({ image: filePath }, function (error: any, exifData: any) {
  //     if (error)
  //       console.log('Error: ' + error.message);
  //     else
  //       console.log(exifData); // Do something with your data!
  //   });
  // } catch (error) {
  //   console.log('Error: ' + error.message);
  // }

  const data: Buffer = await getFileBuffer(filePath);
  // const parser = ExifParserFactory.create(data);
  const Data = ExifParserFactory.create(data).parse();
  console.log(Data);
}