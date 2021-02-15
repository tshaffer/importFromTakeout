import path from 'path';

import {
  isDate,
  isNil,
  isNumber,
  isObject,
  isString,
} from 'lodash';

import {
  ExifData,
  ExifImage,
} from 'exif';
import { DbMediaItem } from '../types';

export const getExifData = async (imageFile: string): Promise<ExifData> => {
  return new Promise((resolve, reject) => {
    try {
      new ExifImage({ image: imageFile }, function (error: any, exifData: any) {
        if (error) {
          return reject(error);
        }
        else {
          return resolve(exifData);
        }
      });
    } catch (error) {
      return reject(error);
    }
  })
};

export const exifToDbItem = (imageFilePath: string, exifData: ExifData): DbMediaItem => {

  /*
    Missing fields
      title
      description
      mimeType?:string;
  */
  const dbMediaItem: DbMediaItem = {
    fileName: path.basename(imageFilePath),
  }

  if (isNumber(exifData.exif.ExifImageWidth)) {
    dbMediaItem.width = exifData.exif.ExifImageWidth;
  }

  if (isNumber(exifData.exif.ExifImageHeight)) {
    dbMediaItem.height = exifData.exif.ExifImageHeight;
  }

  if (isDate(exifData.exif.CreateDate)) {
    dbMediaItem.creationDate = exifData.exif.CreateDate;
  }
  
  if (isDate(exifData.exif.DateTimeOriginal)) {
    dbMediaItem.dateTimeOriginal = exifData.exif.DateTimeOriginal;
  }
  
  if (isString(exifData.image.ModifyDate)) {
    dbMediaItem.modifyDate = exifData.image.ModifyDate;
  }
  
  if (isNumber(exifData.gps.GPSLatitude)) {
    dbMediaItem.gpsLatitude = exifData.gps.GPSLatitude;
  }

  if (isNumber(exifData.gps.GPSLongitude)) {
    dbMediaItem.gpsLongitude = exifData.gps.GPSLongitude;
  }
  
  return dbMediaItem;
}

export const exifPropertyCount: any = {};

exifPropertyCount['image'] = {};
const exifImagePropertyCounts = exifPropertyCount['image'];

exifPropertyCount['exif'] = {};
const exifExifPropertyCounts = exifPropertyCount['exif'];

exifPropertyCount['gps'] = {};
const exifGpsPropertyCounts = exifPropertyCount['gps'];

export const trackExifPropertyCounts = (exifData: ExifData): void => {
  if (!isNil(exifData)) {
    if (isObject(exifData.image)) {
      const imageKeys: string[] = Object.keys(exifData.image);
      for (const imageKey of imageKeys) {
        if (isNil(exifImagePropertyCounts[imageKey])) {
          exifImagePropertyCounts[imageKey] = 1;
        } else {
          exifImagePropertyCounts[imageKey] = exifImagePropertyCounts[imageKey] + 1;
        }
      }
    }
    if (isObject(exifData.exif)) {
      const exifKeys: string[] = Object.keys(exifData.exif);
      for (const exifKey of exifKeys) {
        if (isNil(exifExifPropertyCounts[exifKey])) {
          exifExifPropertyCounts[exifKey] = 1;
        } else {
          exifExifPropertyCounts[exifKey] = exifExifPropertyCounts[exifKey] + 1;
        }
      }
    }
    if (isObject(exifData.gps)) {
      const gpsKeys: string[] = Object.keys(exifData.gps);
      for (const gpsKey of gpsKeys) {
        if (isNil(exifGpsPropertyCounts[gpsKey])) {
          exifGpsPropertyCounts[gpsKey] = 1;
        } else {
          exifGpsPropertyCounts[gpsKey] = exifGpsPropertyCounts[gpsKey] + 1;
        }
      }
    }
  }
}
