import { getFileName, getFilePath, getImageFilePaths } from './fsUtils';
import {
  // exifToDbItem, 
  getExifData,
  trackExifPropertyCounts,
  missingExifDataCount,
  missingImageSizeDataCount,
  missingImageSizeKeyCount,
} from './exifUtils';

import {
  ExifData,
  ExifParserFactory,
} from "ts-exif-parser";

import {
  DbMediaItem
} from '../types';

import {
  addMediaItemToDb, setMediaItemFilePathInDb
} from '../controllers';

import {
  getStringSha1
} from './/fsUtils';

// import { ExifData } from 'exif';

import { mediaItemsDir } from '../app';
import { exifPropertyCount } from './exifUtils';
import { findMe, findPhotosByName } from './dbInterface';
import { isNumber, isObject } from 'lodash';

export const runApp = () => {
  // comment out standard functionality to try matching experiments
  // importImageFiles();

  runMatchExperiments();
}

const importImageFiles = async () => {
  /* algorithm
      get list of image file paths
      for each image file path
        get exif data
        get sha1
        get destination file path from root directory, sha1
        copy file to destination path
        add record to db
          file path
        exif data
  */

  // get list of image file paths
  const imageFilePaths: string[] = getImageFilePaths(mediaItemsDir);
  console.log(imageFilePaths);

  // let imageCount = 0;

  try {
    // for each image file path
    for (const imageFile of imageFilePaths) {

      const imageFilePath = imageFile;
      // const imageFilePath = '/Volumes/SHAFFEROTO/takeout/unzipped/Takeout 15/Google Photos/Photos from 2020/IMG_4464.JPG';
      // const imageFilePath = '/Volumes/SHAFFEROTO/takeout/unzipped/Takeout 1/Google Photos/Summer 2018/IMG_3146.JPG';

      // get exif data

      try {
        const exifData: ExifData = await getExifData(imageFilePath);
        // console.log(exifData);
        trackExifPropertyCounts(exifData, imageFilePath);
      } catch (error) {
        console.log('getExifData Error: ', error);
      }

      // const dbMediaItem: DbMediaItem = exifToDbItem(imageFilePath, exifData);

      // add record to db
      // const dbRecordId = await addMediaItemToDb(dbMediaItem);

      // get sha1
      // const sha1 = getStringSha1(dbRecordId);

      // get destination file path from root directory, sha1
      // const targetFilePath = getFilePath(mediaItemsDir, sha1);

      // copy file to destination path

      // update db record with filePath
      // await setMediaItemFilePathInDb(dbRecordId, targetFilePath);

      // imageCount++;
      // if (imageCount > 100) {
      //   console.log('exifPropertyCount');
      //   console.log(exifPropertyCount);
      //   debugger;
      // }
    }
    console.log('exifPropertyCount');
    console.log(exifPropertyCount);
    console.log('missingExifDataCount');
    console.log(missingExifDataCount);
    console.log('missingImageSizeDataCount');
    console.log(missingImageSizeDataCount);
    console.log('missingImageSizeKeyCount');
    console.log(missingImageSizeKeyCount);
    debugger;
  } catch (error) {
    console.log('Error: ', error);
    // debugger;
  }
}

// const filePath = '/Volumes/SHAFFEROTO/takeout/unzipped/Takeout 15/Google Photos/Photos from 2020/IMG_4464.JPG';

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

const runMatchExperiments = async () => {

  let dateTimeOriginal: Date;
  let modifyDate: Date;
  let createDate: Date;

  const imageFilePaths: string[] = getImageFilePaths(mediaItemsDir);
  for (const imageFilePath of imageFilePaths) {
    const imageFileName: string = getFileName(imageFilePath);
    try {
      const exifData: ExifData = await getExifData(imageFilePath);

      if (isObject(exifData.tags) && isNumber(exifData.tags.DateTimeOriginal)) {
        dateTimeOriginal = new Date(exifData.tags.DateTimeOriginal);
      }
      if (isObject(exifData.tags) && isNumber(exifData.tags.ModifyDate)) {
        modifyDate = new Date(exifData.tags.ModifyDate);
      }
      if (isObject(exifData.tags) && isNumber(exifData.tags.CreateDate)) {
        createDate = new Date(exifData.tags.CreateDate);
      }

      const photos = await findPhotosByName(imageFileName);
      debugger;

    } catch (error) {
      console.log('getExifData Error: ', error);
    }

  }

  // const records = await findMe();
  // console.log(records);
  // debugger;
}
