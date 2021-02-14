import path from 'path';

import {
  isDate,
  isNumber,
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
