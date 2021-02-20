import { getFileName, getFilePath, getImageFilePaths } from './fsUtils';
import {
  // exifToDbItem, 
  getExifData,
  // trackExifPropertyCounts,
  missingExifDataCount,
  missingImageSizeDataCount,
  missingImageSizeKeyCount,
} from './exifUtils';

import {
  ExifDate,
  ExifDateTime,
  Tags
} from 'exiftool-vendored';


// import {
//   ExifData,
//   ExifParserFactory,
// } from "ts-exif-parser";

import {
  DateTimeMatchResultsType,
  DbMediaItem, GPhotosMediaItem, MatchResultsType
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
import { findMe, findGPhotosByName } from './dbInterface';
import { isNil, isNumber, isObject, isString } from 'lodash';

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

      // try {
      //   const exifData: ExifData = await getExifData(imageFilePath);
      //   // console.log(exifData);
      //   trackExifPropertyCounts(exifData, imageFilePath);
      // } catch (error) {
      //   console.log('getExifData Error: ', error);
      // }

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

let matchResultsType: MatchResultsType;
let dateTimeMatchResultsType: DateTimeMatchResultsType;

const runMatchExperiments = async () => {

  let dateTimeOriginal: any;
  let dateTimeOriginalTs: number;
  let modifyDate: any;
  let modifyDateTs: number;
  let createDate: any;
  let createDateTs: number;

  const imageFilePaths: string[] = getImageFilePaths(mediaItemsDir);
  for (const imageFilePath of imageFilePaths) {

    const imageFileName: string = getFileName(imageFilePath);
    try {

      const photos: GPhotosMediaItem[] = await findGPhotosByName(imageFileName);
      if (photos.length === 1) {
        // one match found
        matchResultsType.singleNameMatchesFound++;
      } else if (photos.length === 0) {
        // no match found
        matchResultsType.noNameMatchesFound++;
      } else {

        for (const photo of photos) {
          // Date.parse(photos[0].creationTime) => number that may match createDateTs, etc.
        }
      }





      const exifData: Tags = await getExifData(imageFilePath);

      if (!isNil(exifData.DateTimeOriginal)) {
        dateTimeOriginal = exifData.DateTimeOriginal;
        if (isString(dateTimeOriginal)) {
          dateTimeOriginalTs = Date.parse(dateTimeOriginal);
        } else {
          dateTimeOriginalTs = Date.parse((dateTimeOriginal as ExifDateTime).toISOString());
        }
      }
      if (!isNil(exifData.ModifyDate)) {
        modifyDate = exifData.ModifyDate;
        if (isString(modifyDate)) {
          modifyDateTs = Date.parse(modifyDate);
        } else {
          modifyDateTs = Date.parse((modifyDate as ExifDateTime).toISOString());
        }
      }
      if (!isNil(exifData.CreateDate)) {
        createDate = exifData.CreateDate;
        if (isString(createDate)) {
          createDateTs = Date.parse(createDate);
        } else {
          createDateTs = Date.parse((createDate as ExifDateTime).toISOString());
        }
      }

      // const photos: any[] = await findPhotosByName(imageFileName);
      // for (const photo of photos) {
      //   // Date.parse(photos[0].creationTime) => number that may match createDateTs, etc.
      // }
      debugger;

    } catch (error) {
      console.log('getExifData Error: ', error);
    }

  }

  // const records = await findMe();
  // console.log(records);
  // debugger;
}

const getDateTimeSinceZero = (dt: any): number => {
  let ts = -1;
  if (!isNil(dt)) {
    if (isString(dt)) {
      ts = Date.parse(dt);
    } else {
      ts = Date.parse((dt as ExifDateTime).toISOString());
    }
  }
  return ts;
}
const getDateTimeMatchResultsType = async (filePath: string): Promise<any> => {

  let ts: number;

  let dateTimeOriginal: any;
  let dateTimeOriginalTs: number;
  let modifyDate: any;
  let modifyDateTs: number;
  let createDate: any;
  let createDateTs: number;

  const exifData: Tags = await getExifData(filePath);

  ts = getDateTimeSinceZero(exifData.DateTimeOriginal);

  if (!isNil(exifData.DateTimeOriginal)) {
    dateTimeOriginal = exifData.DateTimeOriginal;
    if (isString(dateTimeOriginal)) {
      dateTimeOriginalTs = Date.parse(dateTimeOriginal);
    } else {
      dateTimeOriginalTs = Date.parse((dateTimeOriginal as ExifDateTime).toISOString());
    }
  }
  if (!isNil(exifData.ModifyDate)) {
    modifyDate = exifData.ModifyDate;
    if (isString(modifyDate)) {
      modifyDateTs = Date.parse(modifyDate);
    } else {
      modifyDateTs = Date.parse((modifyDate as ExifDateTime).toISOString());
    }
  }
  if (!isNil(exifData.CreateDate)) {
    createDate = exifData.CreateDate;
    if (isString(createDate)) {
      createDateTs = Date.parse(createDate);
    } else {
      createDateTs = Date.parse((createDate as ExifDateTime).toISOString());
    }
  }

}