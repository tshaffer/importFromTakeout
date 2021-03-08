import path from 'path';

import {
  isDate,
  isNil,
  isNumber,
  isObject,
  isString,
} from 'lodash';

import {
  exiftool,
  Tags
} from 'exiftool-vendored';

export const getExifData = async (filePath: string): Promise<any> => {
  const tags: Tags = await exiftool.read(filePath);
  return tags;
};

export const exifMatch = (exif0: Tags, exif1: Tags): boolean => {
  if (exif0.Make !== exif1.Make) return false;
  if (exif0.ImageWidth !== exif1.ImageWidth) return false;
  if (exif0.ImageHeight !== exif1.ImageHeight) return false;
  if (exif0.ExifImageWidth !== exif1.ExifImageWidth) return false;
  if (exif0.ExifImageHeight !== exif1.ExifImageHeight) return false;
  return true;
}

import { DbMediaItem } from '../types';
import { getFileBuffer } from './fsUtils';

// export const exifToDbItem = (imageFilePath: string, exifData: ExifData): DbMediaItem => {

//   /*
//     Missing fields
//       title
//       description
//       mimeType?:string;
//   */
//   const dbMediaItem: DbMediaItem = {
//     fileName: path.basename(imageFilePath),
//   }

//   if (isObject(exifData.imageSize) && isNumber(exifData.imageSize.width)) {
//     dbMediaItem.width = exifData.imageSize.width;
//   }

//   if (isObject(exifData.imageSize) && isNumber(exifData.imageSize.height)) {
//     dbMediaItem.height = exifData.imageSize.height;
//   }

//   if (isObject(exifData.tags)) {
//     const tags: ExifTags = exifData.tags;
//     if (isDate(tags.CreateDate)) {
//       dbMediaItem.creationDate = tags.CreateDate;
//     }

//     if (isDate(tags.DateTimeOriginal)) {
//       dbMediaItem.dateTimeOriginal = tags.DateTimeOriginal;
//     }

//     if (isString(tags.ModifyDate)) {
//       dbMediaItem.modifyDate = tags.ModifyDate;
//     }

//     if (isNumber(tags.GPSLatitude)) {
//       dbMediaItem.gpsLatitude = tags.GPSLatitude;
//     }

//     if (isNumber(tags.GPSLongitude)) {
//       dbMediaItem.gpsLongitude = tags.GPSLongitude;
//     }
//   }

//   return dbMediaItem;
// }

export const exifPropertyCount: any = {};

exifPropertyCount['image'] = {};
const exifImagePropertyCounts = exifPropertyCount['image'];

exifPropertyCount['exif'] = {};
const exifExifPropertyCounts = exifPropertyCount['exif'];

// exifPropertyCount['gps'] = {};
// const exifGpsPropertyCounts = exifPropertyCount['gps'];

export let missingExifDataCount = 0;
export let missingImageSizeDataCount = 0;
export let missingImageSizeKeyCount = 0;

// export const trackExifPropertyCounts = (exifData: ExifData, filePath: string): void => {
//   if (!isNil(exifData)) {
//     if (isObject(exifData.imageSize)) {
//       const imageKeys: string[] = Object.keys(exifData.imageSize);
//       if (imageKeys.length === 0) {
//         missingImageSizeKeyCount++;
//       }
//       for (const imageKey of imageKeys) {
//         if (isNil(exifImagePropertyCounts[imageKey])) {
//           exifImagePropertyCounts[imageKey] = 1;
//         } else {
//           exifImagePropertyCounts[imageKey] = exifImagePropertyCounts[imageKey] + 1;
//         }
//       }
//     } else {
//       console.log('no imageSize data for: ', filePath);
//       missingImageSizeDataCount++;
//     }
//     if (isObject(exifData.tags)) {
//       const exifKeys: string[] = Object.keys(exifData.tags);
//       for (const exifKey of exifKeys) {
//         if (isNil(exifExifPropertyCounts[exifKey])) {
//           exifExifPropertyCounts[exifKey] = 1;
//         } else {
//           exifExifPropertyCounts[exifKey] = exifExifPropertyCounts[exifKey] + 1;
//         }
//       }
//       // if (!isNil(exifData.tags.ImageWidth)) {
//       //   console.log('exifData.tags.ImageWidth for : ', filePath, ' is: ', exifData.tags.ImageWidth);
//       // }
//       // if (!isNil(exifData.tags.ImageHeight)) {
//       //   console.log('exifData.tags.ImageHeight for : ', filePath, ' is: ', exifData.tags.ImageHeight);
//       // }
//     }
//   } else {
//     console.log('no exifData for: ', filePath);
//     missingExifDataCount++;
//   }
// }
