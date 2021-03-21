import fs from 'fs';
import path from 'path';

import { closeStream, getFileName, getFilePath, getImageFilePaths, openReadStream, openWriteStream, readStream, writeJsonToFile, writeToWriteStream } from './fsUtils';
import {
  exifMatch,
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
  DbMediaItem, GoogleMediaItem, GoogleMediaMetadata, GooglePhoto, GPhotosMediaItem, MatchResultsType,
  MatchResultType,
} from '../types';

import {
  addMediaItemToDb, getAllMediaItemsFromGoogle, setMediaItemFilePathInDb
} from '../controllers';

import {
  getStringSha1
} from './/fsUtils';

// import { ExifData } from 'exif';

import { mediaItemsDir } from '../app';
import { exifPropertyCount } from './exifUtils';
import { findGPhotosByName } from './dbInterface';
import { isNil, isNumber, isObject, isString } from 'lodash';
import { AuthService } from '../auth';

// maps photo id to list of file paths that matched it
interface MatchedPhoto {
  imageFilePath: string;
  exactMatch: boolean;
}

interface FilePathToExifTags {
  [key: string]: Tags;
}

interface FirstPassResults {
  matchedGoogleMediaItems: IdToMatchedGoogleMediaItem;
  unmatchedGoogleMediaItems: IdToGoogleMediaItems;
  googleMediaItemsToMultipleTakeoutFiles: IdToStringArray;
}

interface SecondPassResults {
  matchedGoogleMediaItems: IdToMatchedGoogleMediaItem;
  unmatchedGoogleMediaItems: GoogleMediaItem[];
}

type IdToGoogleMediaItem = {
  [key: string]: GoogleMediaItem
}

type IdToGoogleMediaItems = {
  [key: string]: GoogleMediaItem[]
}

type IdToMatchedPhotoArray = {
  [key: string]: MatchedPhoto[]
}
type IdToObject = {
  [key: string]: any
}
type IdToAnyArray = {
  [key: string]: any[]
}
type IdToStringArray = {
  [key: string]: string[]
}

type IdToExifData = {
  [key: string]: Tags[];
}

type IdToBools = {
  [key: string]: boolean[];
}

type IdToTakeoutFilesByTimeOfDay = {
  [key: string]: TakeoutFilesByTimeOfDay;
}

interface TakeoutFilesByTimeOfDay {
  dt: number;
  takeoutFilePaths: string[];
}

interface MatchedGoogleMediaItem {
  takeoutFilePath: string;
  googleMediaItem: GoogleMediaItem;
}

type IdToMatchedGoogleMediaItem = {
  [key: string]: MatchedGoogleMediaItem;
}

export const runApp = (authService: AuthService) => {

  // comment out standard functionality to try matching experiments
  // importImageFiles();

  runMatchExperiments(authService);
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

let matchResultsType: MatchResultsType = {
  noNameMatchesFound: 0,
  singleNameMatchesFound: 0,
  dateMatchFoundInMultiple: 0,
  noDateMatchFoundInMultiple: 0,
};

let dateTimeMatchResultsType: DateTimeMatchResultsType = {
  noDateTimeDataCount: 0,
  noDateTimeMatchFound: 0,
  dateTimeWithinMinFound: 0,
  dateTimeWithinMaxFound: 0,
  dateTimeZoneMatchFound: 0,
};

const filePathsNoNameMatchesFound: string[] = [];
const filePathsNoDateMatchesFound: string[] = [];


const googlePhotoIdsToMatchedPhotos: IdToAnyArray = {};

const getGooglePhotoInfo = async (authService: AuthService) => {

  const googleMediaItems: GoogleMediaItem[] = await getAllMediaItemsFromGoogle(authService);
  console.log(googleMediaItems);

  let duplicatesCount = 0;

  const googleMediaItemsById: IdToAnyArray = {};
  // const duplicateGoogleMediaItemsById: IdToObject = {};
  for (const googleMediaItem of googleMediaItems) {
    if (!googleMediaItemsById.hasOwnProperty(googleMediaItem.id)) {
      googleMediaItemsById[googleMediaItem.id] = [];
    }
    googleMediaItemsById[googleMediaItem.id].push(googleMediaItem);
  }

  // const allGooglePhotoIdsStream: any = openWriteStream('/Volumes/SHAFFEROTO/takeout/unzipped/allGooglePhotosIncludingDupes.json');
  // const allGooglePhotosStr = JSON.stringify(googleMediaItemsById);
  // writeToWriteStream(allGooglePhotoIdsStream, allGooglePhotosStr);
  // closeStream(allGooglePhotoIdsStream);

  // const duplicateGooglePhotoIdsStream: any = openWriteStream('/Volumes/SHAFFEROTO/takeout/unzipped/duplicateGooglePhotos.json');
  // const duplicateGooglePhotosStr = JSON.stringify(duplicateGoogleMediaItemsById);
  // writeToWriteStream(duplicateGooglePhotoIdsStream, duplicateGooglePhotosStr);
  // closeStream(duplicateGooglePhotoIdsStream);

  const success: boolean = await writeJsonToFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/googleItemsById.json', googleMediaItemsById);
  console.log(success);
  // debugger;
  // console.log(googleMediaItemsById);
}

const getGooglePhotosWithUniqueCreationDates = async () => {

  const googleMediaItemsByUniqueCreationDate: any = {};
  const googleMediaItemsByDuplicateCreationDate: any = {};

  const googleMediaItemsReadStream: any = openReadStream('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/googleMediaItemsById.json');
  const googleMediaItemsStr: string = await readStream(googleMediaItemsReadStream);
  const googleMediaItemsById: IdToGoogleMediaItems = JSON.parse(googleMediaItemsStr);

  // await writeJsonToFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/output.json', googleMediaItemsById);
  debugger;

  console.log('googleMediaItemsById: number of items');
  console.log(Object.keys(googleMediaItemsById).length);

  const beginningOfTime: Date = new Date('1969-01-15T16:00:00Z');
  const beginningOfTimeStr = '1969-01-15T16:00:00Z';
  let dupeCount = 0;
  let beginningOfTimePhotoCount = 0;
  let noCreationTimePhotoCount = 0;
  for (const id in googleMediaItemsById) {
    if (Object.prototype.hasOwnProperty.call(googleMediaItemsById, id)) {
      const googleMediaItems: GoogleMediaItem[] = googleMediaItemsById[id];
      const googleMediaItem: GoogleMediaItem = googleMediaItems[0];
      if (isObject(googleMediaItems) && (isObject(googleMediaItem.mediaMetadata) && !isNil(googleMediaItem.mediaMetadata.creationTime))) {
        const photoCreationTime: string = googleMediaItem.mediaMetadata.creationTime as unknown as string;
        if (photoCreationTime !== beginningOfTimeStr) {
          if (!googleMediaItemsByUniqueCreationDate.hasOwnProperty(photoCreationTime)) {
            googleMediaItemsByUniqueCreationDate[photoCreationTime] = [];
          } else {
            dupeCount++;
            if (googleMediaItemsByDuplicateCreationDate.hasOwnProperty(photoCreationTime)) {
              googleMediaItemsByDuplicateCreationDate[photoCreationTime].push(googleMediaItem);
            } else {
              googleMediaItemsByDuplicateCreationDate[photoCreationTime] = googleMediaItemsByUniqueCreationDate[photoCreationTime][0];
              googleMediaItemsByDuplicateCreationDate.push(googleMediaItem);
              dupeCount++;
            }
          }
          googleMediaItemsByUniqueCreationDate[photoCreationTime].push(googleMediaItem);
        }
        else {
          console.log('found photo taken at beginning of time');
          beginningOfTimePhotoCount++;
        }
      } else {
        noCreationTimePhotoCount++;
      }
    }
  }

  console.log('unique non zero date count');
  console.log(Object.keys(googleMediaItemsByUniqueCreationDate).length);
  console.log('number of beginning of time photos');
  console.log(beginningOfTimePhotoCount);
  console.log('noCreationTime Photo Count');
  console.log(noCreationTimePhotoCount);

  // const success: boolean = await writeJsonToFile(
  //   '/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/googleMediaItemsByDuplicateCreationDate.json',
  //   googleMediaItemsByDuplicateCreationDate
  // );
  // console.log(success);

  console.log('number of duplicate creation dates');
  console.log(Object.keys(googleMediaItemsByDuplicateCreationDate));
  console.log('number of media items with duplicate creation dates');
  console.log(dupeCount);

  console.log(googleMediaItemsByUniqueCreationDate);
  debugger;
}

const getTakeoutFilesByName = async () => {

  const takeoutFilesByFileName: IdToStringArray = {};
  const takeoutFilesByCreateDate: IdToStringArray = {};
  const takeoutFilesByDateTimeOriginal: IdToStringArray = {};
  const takeoutFilesByModifyDate: IdToStringArray = {};
  const takeoutFilesByImageDimensions: IdToStringArray = {};

  const filePaths: string[] = getImageFilePaths(mediaItemsDir);

  let fileCount = 0;

  for (let filePath of filePaths) {

    const exifData: Tags = await getExifData(filePath);

    addTakeoutFileByFileName(takeoutFilesByFileName, filePath, exifData.FileName);
    addTakeoutFileByDate(takeoutFilesByCreateDate, filePath, exifData.CreateDate);
    addTakeoutFileByDate(takeoutFilesByDateTimeOriginal, filePath, exifData.DateTimeOriginal);
    addTakeoutFileByDate(takeoutFilesByModifyDate, filePath, exifData.ModifyDate);
    addTakeoutFileByImageDimensions(takeoutFilesByImageDimensions, filePath, exifData.ImageWidth, exifData.ImageHeight);

    /* 
      also could consider
        camera / photo specific exif data

      available in accompanying json file
        creationTime
        modificationTime
        photoTakenTime

    */
    fileCount++;

    if ((fileCount % 100) === 0) {
      console.log('fileCount = ', fileCount);
    }

  }

  console.log('key count for takeoutFilesByFileName: ', Object.keys(takeoutFilesByFileName).length);
  console.log('key count for takeoutFilesByCreateDate: ', Object.keys(takeoutFilesByCreateDate).length);
  console.log('key count for takeoutFilesByDateTimeOriginal: ', Object.keys(takeoutFilesByDateTimeOriginal).length);
  console.log('key count for takeoutFilesByModifyDate: ', Object.keys(takeoutFilesByModifyDate).length);
  console.log('key count for takeoutFilesByImageDimensions: ', Object.keys(takeoutFilesByImageDimensions).length);

  // await writeJsonToFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByFileName.json', takeoutFilesByFileName);
  // await writeJsonToFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByCreateDate.json', takeoutFilesByCreateDate);
  // await writeJsonToFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByDateTimeOriginal.json', takeoutFilesByDateTimeOriginal);
  // await writeJsonToFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByModifyDate.json', takeoutFilesByModifyDate);
  // await writeJsonToFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByImageDimensions.json', takeoutFilesByImageDimensions);
}

const getZeroHourDateTime = (ts: any): number | null => {

  const zeroHourDateTime: Date = new Date(ts);

  // day of month: getDate()
  // year (2018): getFullYear()
  // minutes: getMinutes()
  // seconds: getSeconds()
  // milliseconds: getMilliseconds() - ever not zero and not 999?

  // date consists of year, month, minute, second, millisecond
  zeroHourDateTime.setDate(0);
  zeroHourDateTime.setHours(0);

  return Date.parse(zeroHourDateTime.toString());
}

const addTakeoutFileByTimeOfDay = (takeoutFilesByTimeOfDay: IdToTakeoutFilesByTimeOfDay, filePath: string, dt: any) => {

  const dtSinceZero = getDateTimeSinceZero(dt);
  if (isNaN(dtSinceZero) || dtSinceZero < 0) {
    return;
  }

  const ts: number | null = getZeroHourDateTime(dtSinceZero);
  if (!isNil(ts) && ts > 0) {
    const tsKey = ts.toString();
    if (!takeoutFilesByTimeOfDay.hasOwnProperty(tsKey)) {
      takeoutFilesByTimeOfDay[tsKey] = {
        dt: dtSinceZero,
        takeoutFilePaths: [],
      };
      takeoutFilesByTimeOfDay[tsKey].takeoutFilePaths = [];
    }
    takeoutFilesByTimeOfDay[tsKey].takeoutFilePaths.push(filePath);
  }
}


const buildTakeoutFilesByTimeOfDay = async () => {

  const takeoutFilesByCreateDateTimeOfDay: IdToTakeoutFilesByTimeOfDay = {};
  const takeoutFilesByDateTimeOriginalTimeOfDay: IdToTakeoutFilesByTimeOfDay = {};
  const takeoutFilesByModifyDateTimeOfDay: IdToTakeoutFilesByTimeOfDay = {};

  const filePaths: string[] = getImageFilePaths(mediaItemsDir);

  let fileCount = 0;

  for (let filePath of filePaths) {

    const exifData: Tags = await getExifData(filePath);

    addTakeoutFileByTimeOfDay(takeoutFilesByCreateDateTimeOfDay, filePath, exifData.CreateDate);
    addTakeoutFileByTimeOfDay(takeoutFilesByDateTimeOriginalTimeOfDay, filePath, exifData.DateTimeOriginal);
    addTakeoutFileByTimeOfDay(takeoutFilesByModifyDateTimeOfDay, filePath, exifData.ModifyDate);

    fileCount++;
    // if (fileCount === 100) {
    //   break;
    // }
  }

  // await writeJsonToFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByCreateDateTimeOfDay.json', takeoutFilesByCreateDateTimeOfDay);
  // await writeJsonToFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByDateTimeOriginalTimeOfDay.json', takeoutFilesByDateTimeOriginalTimeOfDay);
  // await writeJsonToFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByModifyDateTimeOfDay.json', takeoutFilesByModifyDateTimeOfDay);

}

const addTakeoutFileByFileName = (takeoutFilesByFileName: IdToStringArray, filePath: string, fileName: string) => {
  if (isString(fileName)) {
    if (!takeoutFilesByFileName.hasOwnProperty(fileName)) {
      takeoutFilesByFileName[fileName] = [];
    }
    takeoutFilesByFileName[fileName].push(filePath);
  } else {
    debugger;
  }
}

const addTakeoutFileByDate = (takeoutFilesByDate: IdToStringArray, filePath: string, dt: any) => {
  const ts: number = getDateTimeSinceZero(dt);
  if (ts > 0) {
    const tsKey = ts.toString();
    if (!takeoutFilesByDate.hasOwnProperty(tsKey)) {
      takeoutFilesByDate[tsKey] = [];
    }
    takeoutFilesByDate[tsKey].push(filePath);
  }
}

const addTakeoutFileByImageDimensions = (takeoutFilesByDimensions: IdToStringArray, filePath: string, imageWidth: number, imageHeight: number) => {
  if (isNumber(imageWidth) && isNumber(imageHeight)) {
    const key: string = imageWidth.toString() + '-' + imageHeight.toString();
    if (!takeoutFilesByDimensions.hasOwnProperty(key)) {
      takeoutFilesByDimensions[key] = [];
    }
    takeoutFilesByDimensions[key].push(filePath);
  }
}

const getJsonFromFile = async (filePath: string): Promise<any> => {
  const readFileStream: fs.ReadStream = openReadStream(filePath);
  const fileContents: string = await readStream(readFileStream);
  const jsonObject: IdToMatchedPhotoArray = JSON.parse(fileContents);
  return jsonObject;
}

let tagsMatchMissingGoogleMediaMetadata = 0;
let tagsMatchMissingExifDimensionData = 0;
let tagsMatchDimensionsMismatch = 0;
let tagsMatchMimeTypeMismatch = 0;
let tagsMatchApertureMismatch = 0;
let tagsMatchCameraMakeMismatch = 0;
let tagsMatchCameraModelMismatch = 0;
let tagsMatchIsoMismatch = 0;

const roundToNearestTenth = (valIn: number): number => {
  return Math.round(valIn * 10) / 10;
}

const matchTags = (googleMediaItem: GoogleMediaItem, exifData: Tags): boolean => {

  if (isString(googleMediaItem.mimeType) && googleMediaItem.mimeType !== '') {
    if (isString(exifData.MIMEType)) {
      if (exifData.MIMEType.toLowerCase() !== googleMediaItem.mimeType.toLowerCase()) {
        tagsMatchMimeTypeMismatch++;
        return false;
      }
    }
  }
  if (isObject(googleMediaItem.mediaMetadata)) {

    const mediaMetadata: GoogleMediaMetadata = googleMediaItem.mediaMetadata;

    if (isString(mediaMetadata.width) && isString(mediaMetadata.height)) {
      if (isNumber(exifData.ImageWidth) && isNumber(exifData.ImageHeight)) {
        if (Number(mediaMetadata.width) !== exifData.ImageWidth || Number(mediaMetadata.width) !== exifData.ImageWidth) {
          tagsMatchDimensionsMismatch++;
          return false;
        }
      } else {
        tagsMatchMissingExifDimensionData++;
      }
    }

    if (isObject(mediaMetadata.photo)) {

      const photoMetadata: GooglePhoto = mediaMetadata.photo;

      if (isNumber(photoMetadata.apertureFNumber)) {
        if (isNumber(exifData.Aperture) && roundToNearestTenth(exifData.Aperture) !== roundToNearestTenth(photoMetadata.apertureFNumber)) {
          tagsMatchApertureMismatch++;
          return false;
        }
      }

      if (isString(photoMetadata.cameraMake)) {
        if (isString(exifData.Make) && exifData.Make !== photoMetadata.cameraMake) {
          tagsMatchCameraMakeMismatch++;
          return false;
        }
      }

      if (isString(photoMetadata.cameraModel)) {
        if (isString(exifData.Model) && exifData.Model !== photoMetadata.cameraModel) {
          tagsMatchCameraModelMismatch++;
          return false;
        }
      }

      // if (isNumber(photoMetadata.focalLength)) {
      //   // exifData rounds it off
      // }

      if (isNumber(photoMetadata.isoEquivalent)) {
        if (isNumber(exifData.ISO) && exifData.ISO !== photoMetadata.isoEquivalent) {
          tagsMatchIsoMismatch++;
          return false;
        }
      }
    }

  } else {
    tagsMatchMissingGoogleMediaMetadata++;
    return false;
  }

  return true;
}


const getTagsMatch = async (googleMediaItem: GoogleMediaItem, takeoutFiles: string[]): Promise<string> => {

  for (const takeoutFile of takeoutFiles) {
    let exifData: Tags;
    if (filePathsToExifTags.hasOwnProperty(takeoutFile)) {
      exifData = filePathsToExifTags[takeoutFile];
    } else {
      exifData = await getExifData(takeoutFile);
      filePathsToExifTags[takeoutFile] = exifData;
    } 
    if (matchTags(googleMediaItem, exifData)) {
      return takeoutFile;
    }
  }

  return '';
}

const getTruncatedFileNameMatches = (filesByFileName: any, fileName: string): string[] => {
  const fileExtension: string = path.extname(fileName);
  let fileNameLength = fileName.length;
  while (fileNameLength > (1 + fileExtension.length)) {
    const truncatedFileName = fileName.substring(0, fileNameLength - fileExtension.length) + fileExtension;
    if (filesByFileName.hasOwnProperty(truncatedFileName)) {
      return filesByFileName[truncatedFileName];
    }
    fileNameLength--;
  }

  return [];
}

const old_matchGooglePhotosToTakeoutPhotos = async () => {

  const googleMediaItemsById: IdToGoogleMediaItems = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/googleMediaItemsById.json');
  const takeoutFilesByFileName: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByFileName.json');
  const takeoutFilesByCreateDate: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByCreateDate.json');
  const takeoutFilesByDateTimeOriginal: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByDateTimeOriginal.json');
  const takeoutFilesByModifyDate: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByModifyDate.json');

  const takeoutFilesByCreateDateTimeOfDay: IdToTakeoutFilesByTimeOfDay = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByCreateDateTimeOfDay.json');
  const takeoutFilesByDateTimeOriginalTimeOfDay: IdToTakeoutFilesByTimeOfDay = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByDateTimeOriginalTimeOfDay.json');
  const takeoutFilesByModifyDateTimeOfDay: IdToTakeoutFilesByTimeOfDay = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByModifyDateTimeOfDay.json');

  let uniqueFileNameMatches = 0;
  let singleDateMatches = 0;
  let multipleDateMatches = 0;
  let multipleFileNameMatches = 0;
  let noFileNameMatch = 0;

  let noTakeoutFilesWithSameDimensions = 0;
  let singleTakeoutFilesWithSameDimensions = 0;
  let multipleTakeoutFilesWithSameDimensions = 0;

  let multipleNameMatchesNoDateMatches = 0;
  let multipleNameMatchesMultipleDateMatches = 0;

  const matchedGoogleMediaItems: IdToMatchedGoogleMediaItem = {};
  const unmatchedGoogleMediaItems: GoogleMediaItem[] = [];
  let duplicateGoogleIdsFound = 0;

  let googleMediaItemIdsWithMoreThanOneGoogleMediaItem = 0;

  // FIRST PASS

  for (const key in googleMediaItemsById) {

    if (Object.prototype.hasOwnProperty.call(googleMediaItemsById, key)) {
      const googleMediaItems: GoogleMediaItem[] = googleMediaItemsById[key];

      if (googleMediaItems.length > 1) {
        googleMediaItemIdsWithMoreThanOneGoogleMediaItem++;
      }

      for (const googleMediaItem of googleMediaItems) {

        if (takeoutFilesByFileName.hasOwnProperty(googleMediaItem.filename)) {

          const takeoutFilePaths: string[] = takeoutFilesByFileName[googleMediaItem.filename];

          if (takeoutFilePaths.length === 1) {

            // unique file name match found
            uniqueFileNameMatches++;
            if (matchedGoogleMediaItems.hasOwnProperty(googleMediaItem.id)) {
              duplicateGoogleIdsFound++;
            }

            matchedGoogleMediaItems[googleMediaItem.id] = {
              takeoutFilePath: takeoutFilePaths[0],
              googleMediaItem
            };

          } else {

            // if (googleMediaItem.id === 'AEEKk91iDAm4Yi89bt5v0zD22JZ5iAg-haPU-kNm2pFHrYVnRISEE1tvR-stgKh4syihiOJF9caqvMmnktaHOpdmwGiCQdGSIQ') {
            //   debugger;
            // }

            // multiple file names match; look for a date match
            const matchedTakeoutFiles: string[] = getTakeoutFileWithMatchingNameAndDate(
              googleMediaItem,
              takeoutFilePaths,
              takeoutFilesByCreateDate,
              takeoutFilesByDateTimeOriginal,
              takeoutFilesByModifyDate,
            );
            if (matchedTakeoutFiles.length === 1) {
              singleDateMatches++;
              if (matchedGoogleMediaItems.hasOwnProperty(googleMediaItem.id)) {
                duplicateGoogleIdsFound++;
              }
              matchedGoogleMediaItems[googleMediaItem.id] = {
                takeoutFilePath: matchedTakeoutFiles[0],
                googleMediaItem
              };
            } else {
              multipleFileNameMatches++;
              unmatchedGoogleMediaItems.push(googleMediaItem);
              if (matchedTakeoutFiles.length === 0) {
                // is this because there's actually a matching takeout file but it has no exif date/time info? 
                multipleNameMatchesNoDateMatches++;
              } else {
                // are these multiple files really all the same file?
                multipleNameMatchesMultipleDateMatches++;
              }
            }
          }
        } else {
          noFileNameMatch++;
          unmatchedGoogleMediaItems.push(googleMediaItem);
        }
      }
    }
  }

  console.log('');
  console.log('End of first pass')
  console.log('');
  console.log(Object.keys(googleMediaItemsById).length, '\ttotal number of googleMediaItemsIds');
  // console.log(googleMediaItemIdsWithMoreThanOneGoogleMediaItem, '\tgoogleMediaItemIdsWithMoreThanOneGoogleMediaItem');

  console.log('');
  console.log(uniqueFileNameMatches, '\tunique file name matches');
  console.log(singleDateMatches, '\tsingleDateMatches where there were multiple file name matches');

  console.log('');
  console.log(noFileNameMatch, '\tnoFileNameMatches',);
  console.log(multipleFileNameMatches, '\tmultipleFileNameMatches');
  console.log(unmatchedGoogleMediaItems.length, '\tunmatchedGoogleMediaItems');

  let unmatchedItemNoDateMatch = 0;
  let unmatchedItemSingleDateMatch = 0;
  let unmatchedItemMultipleDateMatches = 0;
  let unmatchedItemMultipleDateMatchesTagMatchFound = 0;
  let unmatchedItemMultipleDateMatchesTagMatchNotFound = 0;

  let stillUnmatchedMediaItemsWithMoreThanOneMatchingFileName = 0;
  let stillUnmatchedMediaItemsWithNoMatchingFileNameCount = 0;
  let numToLowerCaseExtensionMatches = 0;
  let numToUpperCaseExtensionMatches = 0;
  let numMp4Files = 0;
  let numMovFiles = 0;
  let numBmpFiles = 0;
  let numMpgFiles = 0;
  let numNefFiles = 0;

  let truncatedFileNameMatchesCount = 0;

  let matchedNoTimeZoneFilesCount = 0;

  let singleFileNameWithUpperCaseExtensionMatchCount = 0;
  let multipleFileNameWithUpperCaseExtensionMatchCount = 0;

  let matchedTakeoutFiles: string[] = [];
  const stillUnmatchedGoogleMediaItems: GoogleMediaItem[] = [];

  // SECOND PASS

  for (const unmatchedGoogleMediaItem of unmatchedGoogleMediaItems) {

    matchedTakeoutFiles = getTakeoutFileWithMatchingNameAndDate(
      unmatchedGoogleMediaItem,
      [],
      takeoutFilesByCreateDate,
      takeoutFilesByDateTimeOriginal,
      takeoutFilesByModifyDate,
    );
    if (matchedTakeoutFiles.length === 0) {

      // there is no takeout file with a date/time match

      // see if there is a no time zone date/time match
      const matchedNoTimeZoneFiles = getTakeoutFilesWithMatchingNoTimeZoneDateTime(
        unmatchedGoogleMediaItem,
        takeoutFilesByCreateDateTimeOfDay,
        takeoutFilesByDateTimeOriginalTimeOfDay,
        takeoutFilesByModifyDateTimeOfDay,
      );

      if (matchedNoTimeZoneFiles.length > 0) {
        matchedNoTimeZoneFilesCount++;

        if (matchedGoogleMediaItems.hasOwnProperty(unmatchedGoogleMediaItem.id)) {
          duplicateGoogleIdsFound++;
        }
        matchedGoogleMediaItems[unmatchedGoogleMediaItem.id] = {
          // pick the first one - need to ensure that this will always work
          takeoutFilePath: matchedNoTimeZoneFiles[0],
          googleMediaItem: unmatchedGoogleMediaItem
        };
      } else {
        unmatchedItemNoDateMatch++;
        stillUnmatchedGoogleMediaItems.push(unmatchedGoogleMediaItem);
      }

    } else if (matchedTakeoutFiles.length === 1) {

      // single date match between a previous unmatched item and a takeout item
      unmatchedItemSingleDateMatch++;
      if (matchedGoogleMediaItems.hasOwnProperty(unmatchedGoogleMediaItem.id)) {
        duplicateGoogleIdsFound++;
      }
      matchedGoogleMediaItems[unmatchedGoogleMediaItem.id] = {
        takeoutFilePath: matchedTakeoutFiles[0],
        googleMediaItem: unmatchedGoogleMediaItem
      };

    } else {

      // check the order of the next two tests...

      // see if there is a no time zone date/time match
      const matchedNoTimeZoneFiles = getTakeoutFilesWithMatchingNoTimeZoneDateTime(
        unmatchedGoogleMediaItem,
        takeoutFilesByCreateDateTimeOfDay,
        takeoutFilesByDateTimeOriginalTimeOfDay,
        takeoutFilesByModifyDateTimeOfDay,
      );
      if (matchedNoTimeZoneFiles.length > 0) {
        matchedNoTimeZoneFilesCount++;

        if (matchedGoogleMediaItems.hasOwnProperty(unmatchedGoogleMediaItem.id)) {
          duplicateGoogleIdsFound++;
        }
        matchedGoogleMediaItems[unmatchedGoogleMediaItem.id] = {
          // pick the first one - need to ensure that this will always work
          takeoutFilePath: matchedNoTimeZoneFiles[0],
          googleMediaItem: unmatchedGoogleMediaItem
        };
      } else {

        // this is a date match between a previous unmatched item and multiple takeout items
        unmatchedItemMultipleDateMatches++;

        // search for matching takeout item, based on exif tags
        const matchedTakeoutFile: string = await getTagsMatch(unmatchedGoogleMediaItem, matchedTakeoutFiles);
        if (matchedTakeoutFile !== '') {
          unmatchedItemMultipleDateMatchesTagMatchFound++;
          if (matchedGoogleMediaItems.hasOwnProperty(unmatchedGoogleMediaItem.id)) {
            duplicateGoogleIdsFound++;
          }
          matchedGoogleMediaItems[unmatchedGoogleMediaItem.id] = {
            takeoutFilePath: matchedTakeoutFile,
            googleMediaItem: unmatchedGoogleMediaItem
          };
        } else {
          unmatchedItemMultipleDateMatchesTagMatchNotFound++;
          stillUnmatchedGoogleMediaItems.push(unmatchedGoogleMediaItem);
        }
      }
    }
  }

  console.log('');
  console.log('End of second pass')

  console.log('');
  console.log('Date matches for the remaining unmatched google media items.')
  console.log(unmatchedItemSingleDateMatch, '\tSingle date matches');
  console.log(unmatchedItemNoDateMatch, '\tNo date matches');
  console.log(unmatchedItemMultipleDateMatches, '\tMultiple date matches');

  console.log('');
  console.log('For the multiple date matches directly above:')
  console.log(unmatchedItemMultipleDateMatchesTagMatchFound, '\tTag match found');
  console.log(unmatchedItemMultipleDateMatchesTagMatchNotFound, '\tNo tag match found');

  console.log('');
  console.log('Summary of matches');
  console.log(uniqueFileNameMatches, '\tUnique file name matches');
  console.log(singleDateMatches, '\tSingleDateMatches where there were multiple file name matches');
  console.log(unmatchedItemSingleDateMatch, '\tSingle date matches for other files');
  console.log(unmatchedItemMultipleDateMatchesTagMatchFound, '\tMultiple date matches found, tag match found');

  console.log('');
  console.log('matchedNoTimeZoneFilesCount');
  console.log(matchedNoTimeZoneFilesCount);

  console.log('');
  console.log('numTimeDeltasMatched');
  console.log(numTimeDeltasMatched);

  console.log('');
  console.log(stillUnmatchedGoogleMediaItems.length, '\tstillUnmatchedGoogleMediaItems count');

  const remainingUnmatchedGoogleMediaItems: GoogleMediaItem[] = [];
  const remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches: GoogleMediaItem[] = [];
  const remainingUnmatchedGoogleMediaItemsNoFileNameMatches: GoogleMediaItem[] = [];
  const unimportantUnmatchedGoogleMediaItems: GoogleMediaItem[] = [];

  // THIRD PASS

  for (const stillUnmatchedGoogleMediaItem of stillUnmatchedGoogleMediaItems) {
    const fileName = stillUnmatchedGoogleMediaItem.filename;
    if (takeoutFilesByFileName.hasOwnProperty(fileName)) {
      const takeoutFilePaths: string[] = takeoutFilesByFileName[fileName];
      if (takeoutFilePaths.length > 1) {
        stillUnmatchedMediaItemsWithMoreThanOneMatchingFileName++;
        remainingUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
        remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches.push(stillUnmatchedGoogleMediaItem);
        // TEDTODO - there may be a way to still find a match
      } else {
        debugger;
      }
    } else {

      const lowerCaseExtension: string = path.extname(fileName).toLowerCase();

      if (lowerCaseExtension === '.mov') {
        numMovFiles++;
        unimportantUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
      } else if (lowerCaseExtension === '.mp4') {
        numMp4Files++;
        unimportantUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
      } else if (lowerCaseExtension === '.bmp') {
        numBmpFiles++;
        unimportantUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
      } else if (lowerCaseExtension === '.mpg') {
        numMpgFiles++;
        unimportantUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
      } else if (lowerCaseExtension === '.nef') {
        unimportantUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
        numNefFiles++;
      } else if (fileName.includes('Scan')) {
        unimportantUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
      } else {
        const truncatedFileNameMatches: string[] = getTruncatedFileNameMatches(takeoutFilesByFileName, fileName);

        if (truncatedFileNameMatches.length > 0) {

          if (matchedGoogleMediaItems.hasOwnProperty(stillUnmatchedGoogleMediaItem.id)) {
            duplicateGoogleIdsFound++;
          }
          matchedGoogleMediaItems[stillUnmatchedGoogleMediaItem.id] = {
            takeoutFilePath: truncatedFileNameMatches[0],
            googleMediaItem: stillUnmatchedGoogleMediaItem
          };

          truncatedFileNameMatchesCount++;

          // my guess is that this can occur in the following cases
          //    multiple copies of the same file in takeoutFiles
          //    the file name length was short enough that there were multiple matches
          // if (truncatedFileNameMatches.length > 1) {
          //   debugger;
          // }

        } else {
          stillUnmatchedMediaItemsWithNoMatchingFileNameCount++;
          remainingUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
          remainingUnmatchedGoogleMediaItemsNoFileNameMatches.push(stillUnmatchedGoogleMediaItem);
        }
      }
    }
  }

  console.log('');
  console.log('End of third pass')

  console.log('');
  console.log('unimportantUnmatchedGoogleMediaItems count');
  console.log(unimportantUnmatchedGoogleMediaItems.length);
  console.log('remainingUnmatchedGoogleMediaItems count');
  console.log(remainingUnmatchedGoogleMediaItems.length);

  console.log('remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches');
  console.log(remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches);
  console.log('remainingUnmatchedGoogleMediaItemsNoFileNameMatches');
  console.log(remainingUnmatchedGoogleMediaItemsNoFileNameMatches);

  console.log('stillUnmatchedMediaItemsWithMoreThanOneMatchingFileName');
  console.log(stillUnmatchedMediaItemsWithMoreThanOneMatchingFileName);

  console.log('stillUnmatchedMediaItemsWithNoMatchingFileNameCount');
  console.log(stillUnmatchedMediaItemsWithNoMatchingFileNameCount);

  console.log('');

  console.log('truncatedFileNameMatchesCount');
  console.log(truncatedFileNameMatchesCount);

  console.log('numToLowerCaseExtensionMatches');
  console.log(numToLowerCaseExtensionMatches);
  console.log('numToUpperCaseExtensionMatches');
  console.log(numToUpperCaseExtensionMatches);
  console.log('numMp4Files');
  console.log(numMp4Files);
  console.log('numMovFiles');
  console.log(numMovFiles);
  console.log('numBmpFiles');
  console.log(numBmpFiles);
  console.log('numMpgFiles');
  console.log(numMpgFiles);
  console.log('numNefFiles');
  console.log(numNefFiles);

  console.log('singleFileNameWithUpperCaseExtensionMatchCount');
  console.log(singleFileNameWithUpperCaseExtensionMatchCount);
  console.log('multipleFileNameWithUpperCaseExtensionMatchCount');
  console.log(multipleFileNameWithUpperCaseExtensionMatchCount);

  console.log('matchedGoogleMediaItems');
  console.log(matchedGoogleMediaItems.length);

  // const remainingUnmatchedGoogleMediaItemsNoFileNameMatchesStream: any = openWriteStream('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/remainingUnmatchedGoogleMediaItemsNoFileNameMatches.json');
  // const t: any = { items: remainingUnmatchedGoogleMediaItemsNoFileNameMatches };
  // const remainingUnmatchedGoogleMediaItemsNoFileNameMatchesAsStr = JSON.stringify(t);
  // writeToWriteStream(remainingUnmatchedGoogleMediaItemsNoFileNameMatchesStream, remainingUnmatchedGoogleMediaItemsNoFileNameMatchesAsStr);
  // closeStream(remainingUnmatchedGoogleMediaItemsNoFileNameMatchesStream);

  // const remainingUnmatchedGoogleMediaItemsMultipleFileNameMatchesStream: any = openWriteStream('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches.json');
  // const t: any = { items: remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches };
  // const remainingUnmatchedGoogleMediaItemsMultipleFileNameMatchesAsStr = JSON.stringify(t);
  // writeToWriteStream(remainingUnmatchedGoogleMediaItemsMultipleFileNameMatchesStream, remainingUnmatchedGoogleMediaItemsMultipleFileNameMatchesAsStr);
  // closeStream(remainingUnmatchedGoogleMediaItemsMultipleFileNameMatchesStream);

  // const unimportantUnmatchedGoogleMediaItemsStream: any = openWriteStream('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/unimportantUnmatchedGoogleMediaItems.json');
  // const y: any = { items: unimportantUnmatchedGoogleMediaItems };
  // const unimportantUnmatchedGoogleMediaItemsAsStr = JSON.stringify(y);
  // writeToWriteStream(unimportantUnmatchedGoogleMediaItemsStream, unimportantUnmatchedGoogleMediaItemsAsStr);
  // closeStream(unimportantUnmatchedGoogleMediaItemsStream);

  debugger;

  // const stillUnmatchedGoogleMediaItemsStream: any = openWriteStream('/Volumes/SHAFFEROTO/takeout/unzipped/stillUnmatchedGoogleMediaItems.json');
  // const stillUnmatchedGoogleMediaItemsAsStr = JSON.stringify(stillUnmatchedGoogleMediaItemsById);
  // writeToWriteStream(stillUnmatchedGoogleMediaItemsStream, stillUnmatchedGoogleMediaItemsAsStr);
  // closeStream(stillUnmatchedGoogleMediaItemsStream);

  // console.log('\t')
  // console.log('unique matches found = ', uniqueFileNameMatches + singleDateMatches + unmatchedItemSingleDateMatch + unmatchedItemMultipleDateMatchesTagMatchFound);
  // console.log('number unaccounted for = ', Object.keys(googleMediaItemsById).length - (uniqueFileNameMatches + singleDateMatches + unmatchedItemSingleDateMatch + unmatchedItemMultipleDateMatchesTagMatchFound));

  // console.log('');
  // console.log('unique match breakdown');
  // console.log('uniqueFileNameMatches = ', uniqueFileNameMatches); 
  // console.log('singleDateMatches = ', singleDateMatches);
  // console.log('unmatchedItemSingleDateMatch = ', unmatchedItemSingleDateMatch);
  // console.log('unmatchedItemMultipleDateMatchesTagMatchFound = ', unmatchedItemMultipleDateMatchesTagMatchFound);

  // console.log('');
  // console.log('matchedGoogleMediaItems count = ', Object.keys(matchedGoogleMediaItems).length);
  // console.log('unmatchedGoogleMediaItems count = ', unmatchedGoogleMediaItems.length);
  // console.log('duplicateGoogleIdsFound count = ', duplicateGoogleIdsFound);

  // console.log('');
  // console.log('multipleNameMatchesNoDateMatches = ', multipleNameMatchesNoDateMatches);
  // console.log('multipleNameMatchesMultipleDateMatches = ', multipleNameMatchesMultipleDateMatches);

  // console.log('');
  // console.log('tagsMatchMissingGoogleMediaMetadata', tagsMatchMissingGoogleMediaMetadata);
  // console.log('tagsMatchMissingExifDimensionData', tagsMatchMissingExifDimensionData);
  // console.log('tagsMatchDimensionsMismatch', tagsMatchDimensionsMismatch);
  // console.log('tagsMatchMimeTypeMismatch', tagsMatchMimeTypeMismatch);
  // console.log('tagsMatchApertureMismatch', tagsMatchApertureMismatch);
  // console.log('tagsMatchCameraMakeMismatch', tagsMatchCameraMakeMismatch);
  // console.log('tagsMatchCameraModelMismatch', tagsMatchCameraModelMismatch);
  // console.log('tagsMatchIsoMismatch', tagsMatchIsoMismatch);

  // console.log('');
  // console.log('noNameMatchOnUnmatchedItemMultipleDateMatches', noNameMatchOnUnmatchedItemMultipleDateMatches);
  // console.log('singleNameMatchOnUnmatchedItemMultipleDateMatches', singleNameMatchOnUnmatchedItemMultipleDateMatches);
  // console.log('multipleNameMatchOnUnmatchedItemMultipleDateMatches', multipleNameMatchOnUnmatchedItemMultipleDateMatches);
  // console.log('allExifMatchedCount', allExifMatchedCount);
  // console.log('notAllExifMatchedCount', notAllExifMatchedCount);

  // console.log('');
  // console.log('unmatchedItemNoDateMatch = ', unmatchedItemNoDateMatch);
  // console.log('unmatchedItemSingleDateMatch = ', unmatchedItemSingleDateMatch);
  // console.log('unmatchedItemMultipleDateMatches = ', unmatchedItemMultipleDateMatches);
  // console.log('unmatchedItemMultipleDateMatchesTagMatchFound = ', unmatchedItemMultipleDateMatchesTagMatchFound);
  // console.log('unmatchedItemMultipleDateMatchesTagMatchNotFound = ', unmatchedItemMultipleDateMatchesTagMatchNotFound);

  // console.log('');
  // console.log('uniqueFileNameMatches = ', uniqueFileNameMatches);
  // console.log('');

  // console.log('multipleFileNameMatches = ', multipleFileNameMatches);
  // console.log('singleDateMatches = ', singleDateMatches);
  // console.log('multipleDateMatches = ', multipleDateMatches);

  // console.log('');

  // console.log('');
  // console.log('noTakeoutFilesWithSameDimensions = ', noTakeoutFilesWithSameDimensions);
  // console.log('singleTakeoutFilesWithSameDimensions = ', singleTakeoutFilesWithSameDimensions);
  // console.log('multipleTakeoutFilesWithSameDimensions = ', multipleTakeoutFilesWithSameDimensions);

}

const addUniqueFiles = (existingFilePaths: string[], newFilePaths: string[]): string[] => {

  const uniqueFilesMap: any = {};

  for (const existingFilePath of existingFilePaths) {
    if (!uniqueFilesMap.hasOwnProperty(existingFilePath)) {
      uniqueFilesMap[existingFilePath] = true;
    }
  }
  for (const newFilePath of newFilePaths) {
    if (!uniqueFilesMap.hasOwnProperty(newFilePath)) {
      uniqueFilesMap[newFilePath] = true;
    }
  }

  const uniqueFilePaths: string[] = [];
  for (const uniqueFilePath in uniqueFilesMap) {
    if (Object.prototype.hasOwnProperty.call(uniqueFilesMap, uniqueFilePath)) {
      uniqueFilePaths.push(uniqueFilePath);
    }
  }
  return uniqueFilePaths;
}

let msecInOneDay = 86400000;
let numTimeDeltasMatched = 0;

const getTakeoutFilesWithMatchingNoTimeZoneDateTime = (
  googleMediaItem: GoogleMediaItem,
  takeoutFilesByCreateDate: IdToTakeoutFilesByTimeOfDay,
  takeoutFilesByDateTimeOriginal: IdToTakeoutFilesByTimeOfDay,
  takeoutFilesByModifyDate: IdToTakeoutFilesByTimeOfDay,
): string[] => {

  const googleDtNumber = Date.parse(googleMediaItem.mediaMetadata.creationTime as unknown as string);
  const googleDt: Date = new Date(googleDtNumber);
  googleDt.setDate(0);
  googleDt.setHours(0);

  const dtKey = Date.parse((new Date(googleDt)).toString());

  let takeoutFilesWithSameNameAndDate: string[] = [];

  if (takeoutFilesByCreateDate.hasOwnProperty(dtKey)) {

    const timeDelta = Math.abs(googleDtNumber - takeoutFilesByCreateDate[dtKey].dt);

    if (timeDelta <= msecInOneDay) {
      numTimeDeltasMatched++;
    }

    const takeoutFilesWithSameNoTimeZoneDate: string[] = takeoutFilesByCreateDate[dtKey].takeoutFilePaths;
    takeoutFilesWithSameNameAndDate = takeoutFilesWithSameNoTimeZoneDate.map((takeoutFileWithSameDate: string) => {
      return takeoutFileWithSameDate;
    })
  }

  return takeoutFilesWithSameNameAndDate;
}

const getTakeoutFileWithMatchingNameAndDate = (
  googleMediaItem: GoogleMediaItem,
  takeoutFilePaths: string[],
  takeoutFilesByCreateDate: any,
  takeoutFilesByDateTimeOriginal: any,
  takeoutFilesByModifyDate: any,
): string[] => {

  let allMatchingDateTakeoutFiles: string[] = [];

  const creationTimeKey = Date.parse(googleMediaItem.mediaMetadata.creationTime as unknown as string).toString();

  let matchingDateTakeoutFiles: string[] = getTakeoutFilesMatchingGoogleDate(takeoutFilesByCreateDate, creationTimeKey, takeoutFilePaths);

  // TEDTODO - better way to make clone?
  allMatchingDateTakeoutFiles = matchingDateTakeoutFiles.concat([]);

  if (matchingDateTakeoutFiles.length !== 1) {
    if (matchingDateTakeoutFiles.length === 0) {
      matchingDateTakeoutFiles = getTakeoutFilesMatchingGoogleDate(takeoutFilesByDateTimeOriginal, creationTimeKey, takeoutFilePaths);
      allMatchingDateTakeoutFiles = addUniqueFiles(allMatchingDateTakeoutFiles, matchingDateTakeoutFiles);
      if (matchingDateTakeoutFiles.length !== 1) {
        if (matchingDateTakeoutFiles.length === 0) {
          matchingDateTakeoutFiles = getTakeoutFilesMatchingGoogleDate(takeoutFilesByModifyDate, creationTimeKey, takeoutFilePaths);
          allMatchingDateTakeoutFiles = addUniqueFiles(allMatchingDateTakeoutFiles, matchingDateTakeoutFiles);
        }
      }
    }
  }

  return allMatchingDateTakeoutFiles;
  // if (matchingDateTakeoutFiles.length === 1) {
  //   return matchingDateTakeoutFiles[0];
  // }

  // return '';
}




const getNonDateExifMatch = async (
  googleMediaItem: GoogleMediaItem,
  takeoutFilePaths: string[],
): Promise<string[]> => {

  // iterate through the takeout files that have the same name, same date 

  const takeoutFilesWithSameDimensions: string[] = [];

  // for (const takeoutFilePath of takeoutFilePaths) {
  //   const exifData: Tags = await getExifData(takeoutFilePath);
  //   // console.log('Tags for takeoutFilePath: ', takeoutFilePath);
  //   // console.log(exifData);
  //   if (isObject(googleMediaItem.mediaMetadata)) {
  //     if (isString(googleMediaItem.mediaMetadata.width)) {
  //       const gWidth = Number(googleMediaItem.mediaMetadata.width);
  //       if (!isNaN(gWidth)) {
  //         if (isString(googleMediaItem.mediaMetadata.height)) {
  //           const gHeight = Number(googleMediaItem.mediaMetadata.height);
  //           if (!isNaN(gHeight)) {
  //             if (isNumber(exifData.ImageWidth) && exifData.ImageWidth === gWidth && isNumber(exifData.ImageHeight) && exifData.ImageHeight === gHeight) {
  //               takeoutFilesWithSameDimensions.push(takeoutFilePath);
  //             } else if (isNumber(exifData.ExifImageWidth) && exifData.ExifImageWidth === gWidth && isNumber(exifData.ExifImageHeight) && exifData.ExifImageHeight === gHeight) {
  //               takeoutFilesWithSameDimensions.push(takeoutFilePath);
  //             }
  //             // check for portrait mode where width and height are swapped
  //             else if (isNumber(exifData.ImageWidth) && exifData.ImageWidth === gHeight && isNumber(exifData.ImageHeight) && exifData.ImageHeight === gWidth) {
  //               takeoutFilesWithSameDimensions.push(takeoutFilePath);
  //             } else if (isNumber(exifData.ExifImageWidth) && exifData.ExifImageWidth === gHeight && isNumber(exifData.ExifImageHeight) && exifData.ExifImageHeight === gWidth) {
  //               takeoutFilesWithSameDimensions.push(takeoutFilePath);
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }
  // }

  // if (takeoutFilesWithSameDimensions.length <= 1) {
  //   console.log('gMediaItem: ', googleMediaItem.filename);
  //   console.log('takeoutFiles');
  //   console.log('takeoutFilesWithSameDimensions');
  //   console.log(takeoutFilesWithSameDimensions);

  // }
  return takeoutFilesWithSameDimensions;

}

const getMultipleDateMatches = (
  googleMediaItem: GoogleMediaItem,
  takeoutFilesByCreateDate: IdToStringArray,
  takeoutFilesByDateTimeOriginal: IdToStringArray,
  takeoutFilesByModifyDate: IdToStringArray,
): string[] => {

  const uniqueFilePaths: any = {};

  const creationTimeKey = Date.parse(googleMediaItem.mediaMetadata.creationTime as unknown as string).toString();
  let matchingTakeoutFiles: string[] = getTakeoutFilesMatchingGoogleDate(takeoutFilesByCreateDate, creationTimeKey, []);
  matchingTakeoutFiles = matchingTakeoutFiles.concat(getTakeoutFilesMatchingGoogleDate(takeoutFilesByDateTimeOriginal, creationTimeKey, []));
  matchingTakeoutFiles = matchingTakeoutFiles.concat(getTakeoutFilesMatchingGoogleDate(takeoutFilesByModifyDate, creationTimeKey, []));
  for (const matchingTakeoutFile of matchingTakeoutFiles) {
    if (!uniqueFilePaths.hasOwnProperty(matchingTakeoutFile)) {
      uniqueFilePaths[matchingTakeoutFile] = true;
    }
  }

  return Object.keys(uniqueFilePaths);

  // iterate through the takeout files that have the same name, same date 
  // console.log('Google media item');
  // console.log(googleMediaItem);
  // for (const uniqueFilePath in uniqueFilePaths) {
  //   if (Object.prototype.hasOwnProperty.call(uniqueFilePaths, uniqueFilePath)) {
  //     const exifData: Tags = await getExifData(uniqueFilePath);
  //     console.log('Tags for uniqueFilePath: ', uniqueFilePath);
  //     console.log(exifData);
  //   }
  // }
}

const getTakeoutFilesMatchingGoogleDate = (
  takeoutFilesByDate: IdToStringArray,
  dt: string,
  takeoutFilePaths: string[]): string[] => {

  if (takeoutFilesByDate.hasOwnProperty(dt)) {
    let takeoutFilesWithSameNameAndDate: string[] = [];
    const takeoutFilesWithSameDate: string[] = takeoutFilesByDate[dt];
    if (takeoutFilePaths.length > 0) {
      for (const matchingTakeoutFile of takeoutFilesWithSameDate) {
        if (takeoutFilePaths.indexOf(matchingTakeoutFile) >= 0) {
          takeoutFilesWithSameNameAndDate.push(matchingTakeoutFile);
        }
      }
    } else {
      takeoutFilesWithSameNameAndDate = takeoutFilesWithSameDate.map((takeoutFileWithSameDate: string) => {
        return takeoutFileWithSameDate;
      })
    }
    return takeoutFilesWithSameNameAndDate;
  }

  return [];
}

const getExifDataByGoogleIdForGoogleMediaItemsWithMultipleFileNameMatchesAndGpsData = async () => {

  const exifDataWithGPSByGoogleId: IdToExifData = {};
  const hasDateTimeWithGPSByGoogleId: IdToBools = {};

  const googleMediaItemsWhereAtLeastOneTakeoutFileHasGps: IdToGoogleMediaItem = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/googleMediaItemsWhereAtLeastOneTakeoutFileHasGps.json');
  const takeoutFilesByFileName: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByFileName.json');

  for (const key in googleMediaItemsWhereAtLeastOneTakeoutFileHasGps) {
    if (Object.prototype.hasOwnProperty.call(googleMediaItemsWhereAtLeastOneTakeoutFileHasGps, key)) {
      const googleMediaItem: GoogleMediaItem = googleMediaItemsWhereAtLeastOneTakeoutFileHasGps[key];
      if (takeoutFilesByFileName.hasOwnProperty(googleMediaItem.filename)) {
        const takeoutFilePaths: string[] = takeoutFilesByFileName[googleMediaItem.filename];
        for (const takeoutFilePath of takeoutFilePaths) {
          const exifData: Tags = await getExifData(takeoutFilePath);
          if (!isNil(exifData.GPSLatitude)) {
            if (!exifDataWithGPSByGoogleId.hasOwnProperty(googleMediaItem.id)) {
              exifDataWithGPSByGoogleId[googleMediaItem.id] = [];
            }
            exifDataWithGPSByGoogleId[googleMediaItem.id].push(exifData);

            const hasDateTime: boolean = !isNil(exifData.CreateDate) || !isNil(exifData.DateTimeOriginal) || !isNil(exifData.ModifyDate);

            if (!hasDateTimeWithGPSByGoogleId.hasOwnProperty(googleMediaItem.id)) {
              hasDateTimeWithGPSByGoogleId[googleMediaItem.id] = [];
            }
            hasDateTimeWithGPSByGoogleId[googleMediaItem.id].push(hasDateTime);

          }
        }
      }
      else {
        debugger;
      }
    }
  }

  console.log(exifDataWithGPSByGoogleId);

  debugger;
}

const matchUnmatchedFiles = async () => {

  const remainingUnmatchedGoogleMediaItemsNoFileNameMatchesAny: any = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/remainingUnmatchedGoogleMediaItemsNoFileNameMatches.json');
  const remainingUnmatchedGoogleMediaItemsNoFileNameMatches: GoogleMediaItem[] = remainingUnmatchedGoogleMediaItemsNoFileNameMatchesAny.items;
  const takeoutFilesByFileName: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByFileName.json');

  for (const googleMediaItem of remainingUnmatchedGoogleMediaItemsNoFileNameMatches) {
    const fileName = googleMediaItem.filename;
    const fileExtension: string = path.extname(fileName);

    const filePathWithoutExtension = fileName.split('.').slice(0, -1).join('.');

    const filePathWithUpperCaseExtension = filePathWithoutExtension + fileExtension.toUpperCase();
    if (takeoutFilesByFileName.hasOwnProperty(filePathWithUpperCaseExtension)) {
      debugger;
    }
    const filePathWithLowerCaseExtension = filePathWithoutExtension + fileExtension.toLowerCase();
    if (takeoutFilesByFileName.hasOwnProperty(filePathWithLowerCaseExtension)) {
      debugger;
    }
  }

  debugger;
}

const searchForGpsDataInMultipleFileNameMatches = async () => {

  const remainingUnmatchedGoogleMediaItemsMultipleFileNameMatchesAny: any = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches.json');
  const remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches: GoogleMediaItem[] = remainingUnmatchedGoogleMediaItemsMultipleFileNameMatchesAny.items;
  const takeoutFilesByFileName: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByFileName.json');

  let fileCount = 0;
  let filesWithGPSAndDateData = 0;
  let filesWithGPSButNoDateCount = 0;
  const googleItemsWithGPSButNoDateFile: GoogleMediaItem[] = [];
  const filesWithGPSButNoDate: string[] = [];
  const googleItemsWithOnlyOneThatHasNoDateTime: GoogleMediaItem[] = [];
  const filesThatAreOnlyOneWithNoDateTime: string[] = [];
  const filesWithNoDateTimeHaveGPS: boolean[] = [];
  let filesWithNoDateTimeHaveGPSCount = 0;
  let fileWithNoDateTime;

  let filesWithNoDateTimeCount = 0;
  let filesWithMultipleDateTimeCount = 0;
  let filesWithZeroDateTimeCount = 0;

  let atLeastOneTakeoutFileHasGpsForGoogleMediaItemCount = 0;
  const googleMediaItemsWhereAtLeastOneTakeoutFileHasGps: any = {};

  for (const googleMediaItem of remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches) {
    const takeoutFilesWithSameFileName: string[] = takeoutFilesByFileName[googleMediaItem.filename];
    let filesWithNoDateTime = 0;
    let fileWithNoDateTimeHasGPS = false;
    let oneOfTakeoutFilesHasGps = false;
    for (const takeoutFilePath of takeoutFilesWithSameFileName) {
      const exifData: Tags = await getExifData(takeoutFilePath);
      if (!isNil(exifData.GPSLatitude)) {
        oneOfTakeoutFilesHasGps = true;
      }
      if (isNil(exifData.CreateDate) && isNil(exifData.DateTimeOriginal) && isNil(exifData.ModifyDate)) {
        filesWithNoDateTime++;
        fileWithNoDateTimeHasGPS = !isNil(exifData.GPSLatitude);
        fileWithNoDateTime = takeoutFilePath;
        if (!isNil(exifData.GPSLatitude)) {
          googleItemsWithGPSButNoDateFile.push(googleMediaItem);
          filesWithGPSButNoDate.push(takeoutFilePath);
          filesWithGPSButNoDateCount++;
        }
      } else if (!isNil(exifData.GPSLatitude)) {
        filesWithGPSAndDateData++;
      }
    }
    if (filesWithNoDateTime === 1) {
      googleItemsWithOnlyOneThatHasNoDateTime.push(googleMediaItem);
      filesThatAreOnlyOneWithNoDateTime.push(fileWithNoDateTime);
      filesWithNoDateTimeHaveGPS.push(fileWithNoDateTimeHasGPS);
      if (fileWithNoDateTimeHasGPS) {
        filesWithNoDateTimeHaveGPSCount++;
      }
      filesWithNoDateTimeCount++;
    } else if (filesWithNoDateTime === 0) {
      filesWithZeroDateTimeCount++;
    } else {
      filesWithMultipleDateTimeCount++;
    }


    if (oneOfTakeoutFilesHasGps) {
      atLeastOneTakeoutFileHasGpsForGoogleMediaItemCount++;
      googleMediaItemsWhereAtLeastOneTakeoutFileHasGps[googleMediaItem.id] = googleMediaItem;
    }

    fileCount++;
    if ((fileCount % 100) === 0) {
      console.log(fileCount);
      console.log(filesWithGPSButNoDateCount);
      console.log(filesWithGPSAndDateData);
    }
  }

  const googleMediaItemsWhereAtLeastOneTakeoutFileHasGpsStream: any = openWriteStream('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/googleMediaItemsWhereAtLeastOneTakeoutFileHasGps.json');
  const googleMediaItemsWhereAtLeastOneTakeoutFileHasGpsAsStr = JSON.stringify(googleMediaItemsWhereAtLeastOneTakeoutFileHasGps);
  writeToWriteStream(googleMediaItemsWhereAtLeastOneTakeoutFileHasGpsStream, googleMediaItemsWhereAtLeastOneTakeoutFileHasGpsAsStr);
  closeStream(googleMediaItemsWhereAtLeastOneTakeoutFileHasGpsStream);

  console.log(fileCount);
  console.log(filesWithGPSButNoDateCount);
  console.log(filesWithGPSAndDateData);
  console.log(googleItemsWithGPSButNoDateFile);
  console.log(filesWithGPSButNoDate);

  console.log(googleItemsWithOnlyOneThatHasNoDateTime);
  console.log(filesThatAreOnlyOneWithNoDateTime);
  console.log(filesWithNoDateTimeHaveGPS);
  console.log(filesWithNoDateTimeHaveGPSCount);

  console.log(filesWithNoDateTimeCount);
  console.log(filesWithMultipleDateTimeCount);
  console.log(filesWithZeroDateTimeCount);

  console.log(atLeastOneTakeoutFileHasGpsForGoogleMediaItemCount);

  debugger;
}

const unusedExtension: string[] = ['.mov', '.mp4', '.bmp', '.mpg', '.nef'];

const trimUnimportantMediaItems = async (googleMediaItemsById: IdToGoogleMediaItems,
) => {
  for (const key in googleMediaItemsById) {
    if (Object.prototype.hasOwnProperty.call(googleMediaItemsById, key)) {
      const googleMediaItems: GoogleMediaItem[] = googleMediaItemsById[key];
      let index = 0;
      const indicesToRemove: number[] = [];
      for (const googleMediaItem of googleMediaItems) {
        const fileName = googleMediaItem.filename;
        if (unusedExtension.some(substring => fileName.includes(substring))) {
          indicesToRemove.push(index);
        } else if (fileName.includes('Scan')) {
          indicesToRemove.push(index);
        }
        index++;
      }
      if (indicesToRemove.length > 0) {
        let indexOfItemToRemove = indicesToRemove.length - 1;
        while (indexOfItemToRemove >= 0) {
          googleMediaItems.splice(indexOfItemToRemove, 1)
          indexOfItemToRemove--;
        }
        if (googleMediaItems.length === 0) {
          delete googleMediaItemsById[key];
        }
      }
    }
  }
}

const matchGooglePhotosToTakeoutPhotos_1 = async (
  googleMediaItemsById: IdToGoogleMediaItems,
  takeoutFilesByFileName: IdToStringArray)
  : Promise<FirstPassResults> => {

  const matchedGoogleMediaItems: IdToMatchedGoogleMediaItem = {};
  const unmatchedGoogleMediaItems: IdToGoogleMediaItems = {};
  const googleMediaItemsToMultipleTakeoutFiles: IdToStringArray = {};

  for (const key in googleMediaItemsById) {
    if (Object.prototype.hasOwnProperty.call(googleMediaItemsById, key)) {
      const googleMediaItems: GoogleMediaItem[] = googleMediaItemsById[key];
      for (const googleMediaItem of googleMediaItems) {
        if (takeoutFilesByFileName.hasOwnProperty(googleMediaItem.filename)) {
          const takeoutFilePaths: string[] = takeoutFilesByFileName[googleMediaItem.filename];
          if (takeoutFilePaths.length === 1) {
            matchedGoogleMediaItems[googleMediaItem.id] = {
              takeoutFilePath: takeoutFilePaths[0],
              googleMediaItem
            };
          } else {
            googleMediaItemsToMultipleTakeoutFiles[googleMediaItem.id] = takeoutFilePaths;
            unmatchedGoogleMediaItems[googleMediaItem.id] = googleMediaItemsById[googleMediaItem.id];
          }
        } else {
          unmatchedGoogleMediaItems[googleMediaItem.id] = googleMediaItemsById[googleMediaItem.id];
        }
      }
    }
  }
  const results: FirstPassResults = {
    matchedGoogleMediaItems,
    unmatchedGoogleMediaItems,
    googleMediaItemsToMultipleTakeoutFiles
  };
  return results;
}

const matchGooglePhotosToTakeoutPhotos_2 = async (
  matchedGoogleMediaItems: IdToMatchedGoogleMediaItem,
  unmatchedGoogleMediaItems: IdToGoogleMediaItems): Promise<SecondPassResults> => {

  const takeoutFilesByCreateDate: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByCreateDate.json');
  const takeoutFilesByDateTimeOriginal: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByDateTimeOriginal.json');
  const takeoutFilesByModifyDate: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByModifyDate.json');

  const takeoutFilesByCreateDateTimeOfDay: IdToTakeoutFilesByTimeOfDay = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByCreateDateTimeOfDay.json');
  const takeoutFilesByDateTimeOriginalTimeOfDay: IdToTakeoutFilesByTimeOfDay = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByDateTimeOriginalTimeOfDay.json');
  const takeoutFilesByModifyDateTimeOfDay: IdToTakeoutFilesByTimeOfDay = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByModifyDateTimeOfDay.json');

  let matchedTakeoutFiles: string[] = [];
  const stillUnmatchedGoogleMediaItems: GoogleMediaItem[] = [];

  for (const key in unmatchedGoogleMediaItems) {
    if (Object.prototype.hasOwnProperty.call(unmatchedGoogleMediaItems, key)) {
      const unmatchedGoogleMediaItemsList: GoogleMediaItem[] = unmatchedGoogleMediaItems[key];
      for (const unmatchedGoogleMediaItem of unmatchedGoogleMediaItemsList) {
        matchedTakeoutFiles = getTakeoutFileWithMatchingNameAndDate(
          unmatchedGoogleMediaItem,
          [],
          takeoutFilesByCreateDate,
          takeoutFilesByDateTimeOriginal,
          takeoutFilesByModifyDate,
        );
        if (matchedTakeoutFiles.length === 0) {

          // there is no takeout file with a date/time match

          // see if there is a no time zone date/time match
          const matchedNoTimeZoneFiles = getTakeoutFilesWithMatchingNoTimeZoneDateTime(
            unmatchedGoogleMediaItem,
            takeoutFilesByCreateDateTimeOfDay,
            takeoutFilesByDateTimeOriginalTimeOfDay,
            takeoutFilesByModifyDateTimeOfDay,
          );

          if (matchedNoTimeZoneFiles.length > 0) {

            matchedGoogleMediaItems[unmatchedGoogleMediaItem.id] = {
              // pick the first one - need to ensure that this will always work
              takeoutFilePath: matchedNoTimeZoneFiles[0],
              googleMediaItem: unmatchedGoogleMediaItem
            };
          } else {
            stillUnmatchedGoogleMediaItems.push(unmatchedGoogleMediaItem);
          }

        } else if (matchedTakeoutFiles.length === 1) {

          // single date match between a previous unmatched item and a takeout item
          matchedGoogleMediaItems[unmatchedGoogleMediaItem.id] = {
            takeoutFilePath: matchedTakeoutFiles[0],
            googleMediaItem: unmatchedGoogleMediaItem
          };

        } else {

          // check the order of the next two tests...

          // see if there is a no time zone date/time match
          const matchedNoTimeZoneFiles = getTakeoutFilesWithMatchingNoTimeZoneDateTime(
            unmatchedGoogleMediaItem,
            takeoutFilesByCreateDateTimeOfDay,
            takeoutFilesByDateTimeOriginalTimeOfDay,
            takeoutFilesByModifyDateTimeOfDay,
          );
          if (matchedNoTimeZoneFiles.length > 0) {
            matchedGoogleMediaItems[unmatchedGoogleMediaItem.id] = {
              // pick the first one - need to ensure that this will always work
              takeoutFilePath: matchedNoTimeZoneFiles[0],
              googleMediaItem: unmatchedGoogleMediaItem
            };
          } else {

            // search for matching takeout item, based on exif tags
            const matchedTakeoutFile: string = await getTagsMatch(unmatchedGoogleMediaItem, matchedTakeoutFiles);
            if (matchedTakeoutFile !== '') {
              matchedGoogleMediaItems[unmatchedGoogleMediaItem.id] = {
                takeoutFilePath: matchedTakeoutFile,
                googleMediaItem: unmatchedGoogleMediaItem
              };
            } else {
              stillUnmatchedGoogleMediaItems.push(unmatchedGoogleMediaItem);
            }
          }
        }
      }
    }
  }

  const results: SecondPassResults = {
    matchedGoogleMediaItems,
    unmatchedGoogleMediaItems: stillUnmatchedGoogleMediaItems
  };
  return results;
}

const matchGooglePhotosToTakeoutPhotos_3 = async (
  takeoutFilesByFileName: IdToStringArray,
  matchedGoogleMediaItems: IdToMatchedGoogleMediaItem,
  stillUnmatchedGoogleMediaItems: GoogleMediaItem[]) => {

  const remainingUnmatchedGoogleMediaItems: GoogleMediaItem[] = [];
  const remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches: GoogleMediaItem[] = [];
  const remainingUnmatchedGoogleMediaItemsNoFileNameMatches: GoogleMediaItem[] = [];
  const unimportantUnmatchedGoogleMediaItems: GoogleMediaItem[] = [];


  for (const stillUnmatchedGoogleMediaItem of stillUnmatchedGoogleMediaItems) {
    const fileName = stillUnmatchedGoogleMediaItem.filename;
    if (takeoutFilesByFileName.hasOwnProperty(fileName)) {
      const takeoutFilePaths: string[] = takeoutFilesByFileName[fileName];
      if (takeoutFilePaths.length > 1) {
        remainingUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
        remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches.push(stillUnmatchedGoogleMediaItem);
      } else {
        debugger;
      }
    } else {

      const lowerCaseExtension: string = path.extname(fileName).toLowerCase();

      if (lowerCaseExtension === '.mov') {
        unimportantUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
      } else if (lowerCaseExtension === '.mp4') {
        unimportantUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
      } else if (lowerCaseExtension === '.bmp') {
        unimportantUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
      } else if (lowerCaseExtension === '.mpg') {
        unimportantUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
      } else if (lowerCaseExtension === '.nef') {
        unimportantUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
      } else if (fileName.includes('Scan')) {
        unimportantUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
      } else {
        const truncatedFileNameMatches: string[] = getTruncatedFileNameMatches(takeoutFilesByFileName, fileName);
        if (truncatedFileNameMatches.length > 0) {
          matchedGoogleMediaItems[stillUnmatchedGoogleMediaItem.id] = {
            takeoutFilePath: truncatedFileNameMatches[0],
            googleMediaItem: stillUnmatchedGoogleMediaItem
          };
        } else {
          remainingUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
          remainingUnmatchedGoogleMediaItemsNoFileNameMatches.push(stillUnmatchedGoogleMediaItem);
        }
      }
    }
  }

  const results: any = {
    remainingUnmatchedGoogleMediaItemsNoFileNameMatches,
    remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches,
    unimportantUnmatchedGoogleMediaItems
  };

  return results;
}

let filePathsToExifTags: FilePathToExifTags = {};

const readFilePathsToExifTags = async () => {
  filePathsToExifTags = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/filePathsToExifTags.json');
}

const writeFilePathsToExifTags = async () => {
  const filePathsToExifTagsStream: any = openWriteStream('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/filePathsToExifTags.json');
  const filePathsToExifTagsAsStr = JSON.stringify(filePathsToExifTags);
  writeToWriteStream(filePathsToExifTagsStream, filePathsToExifTagsAsStr);
  closeStream(filePathsToExifTagsStream);
}

const runMatchExperiments = async (authService: AuthService) => {

  const googleMediaItemsById: IdToGoogleMediaItems = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/googleMediaItemsById.json');
  const takeoutFilesByFileName: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByFileName.json');
  await readFilePathsToExifTags();

  console.log(Object.keys(googleMediaItemsById).length);
  trimUnimportantMediaItems(googleMediaItemsById);
  console.log(Object.keys(googleMediaItemsById).length);

  const firstPassResults: FirstPassResults = await matchGooglePhotosToTakeoutPhotos_1(googleMediaItemsById, takeoutFilesByFileName);
  const { matchedGoogleMediaItems, unmatchedGoogleMediaItems, googleMediaItemsToMultipleTakeoutFiles } = firstPassResults;
  console.log('firstPassResults');
  console.log(Object.keys(matchedGoogleMediaItems).length);
  console.log(Object.keys(unmatchedGoogleMediaItems).length);
  console.log(Object.keys(googleMediaItemsToMultipleTakeoutFiles).length);

  const secondPassResults: SecondPassResults = await matchGooglePhotosToTakeoutPhotos_2(matchedGoogleMediaItems, unmatchedGoogleMediaItems);
  const newMatchedGoogleMediaItems = secondPassResults.matchedGoogleMediaItems;
  const stillUnmatchedGoogleMediaItems = secondPassResults.unmatchedGoogleMediaItems;

  console.log('secondPassResults');
  console.log(Object.keys(matchedGoogleMediaItems).length);
  console.log(Object.keys(newMatchedGoogleMediaItems).length);
  console.log(stillUnmatchedGoogleMediaItems.length);
  debugger;

  const thirdPassResults: any = await matchGooglePhotosToTakeoutPhotos_3(takeoutFilesByFileName, newMatchedGoogleMediaItems, stillUnmatchedGoogleMediaItems);
  debugger;

  await matchUnmatchedFiles();
  debugger;

  await getExifDataByGoogleIdForGoogleMediaItemsWithMultipleFileNameMatchesAndGpsData();
  debugger;

  await searchForGpsDataInMultipleFileNameMatches();
  // debugger;

  // await buildTakeoutFilesByTimeOfDay();
  // debugger;

  await old_matchGooglePhotosToTakeoutPhotos;
  debugger;

  await getTakeoutFilesByName();
  debugger;

  await getGooglePhotosWithUniqueCreationDates();

  debugger;

  await getGooglePhotoInfo(authService);

  // const filePathsNoNameMatchesFoundStream: any = openWriteStream('/Volumes/SHAFFEROTO/takeout/unzipped/noFileNameMatches.txt');
  // const filePathsNoDateMatchesFoundStream: any = openWriteStream('/Volumes/SHAFFEROTO/takeout/unzipped/noDateTimeMatches.txt');
  // const googlePhotoIdsToMatchedPhotosStream: any = openWriteStream('/Volumes/SHAFFEROTO/takeout/unzipped/googlePhotoIdsToMatchedPhotos.json');


  const googlePhotoIdsToMatchedPhotosStream: any = openReadStream('/Volumes/SHAFFEROTO/takeout/unzipped/googlePhotoIdsToMatchedPhotos.json');
  const googlePhotoIdsToMatchedPhotosStr: string = await readStream(googlePhotoIdsToMatchedPhotosStream);
  const googlePhotoIdsToMatchedPhotos: IdToMatchedPhotoArray = JSON.parse(googlePhotoIdsToMatchedPhotosStr);

  let fileCount = 0;

  const imageFilePaths: string[] = getImageFilePaths(mediaItemsDir);

  for (let imageFilePath of imageFilePaths) {

    // if (fileCount >= 100000) {
    //   debugger;
    //   console.log(matchResultsType);
    //   console.log(dateTimeMatchResultsType);
    // }

    try {

      // imageFilePath = '/Volumes/SHAFFEROTO/takeout/unzipped/Takeout 1/Google Photos/Aspen Southwest 2012/IMG_0045.JPG';
      // imageFilePath = '/Volumes/SHAFFEROTO/takeout/unzipped/Takeout 1/Google Photos/Trips/AGF00017.JPG';
      // imageFilePath = '/Volumes/SHAFFEROTO/takeout/unzipped/Takeout 3/Google Photos/Rachel and Troy/IMG_0050.JPG';
      let imageFileName: string = getFileName(imageFilePath);
      let photos: GPhotosMediaItem[] = await findGPhotosByName(imageFileName);
      // if (photos.length === 0) {
      //   const photos = await findGPhotosByNameStartsWith(imageFileName);
      //   for (const photo of photos) {
      //     if (!googlePhotoIdsToMatchedPhotos.hasOwnProperty(photo.id)) {
      //       googlePhotoIdsToMatchedPhotos[photo.id] = [];
      //     }
      //     googlePhotoIdsToMatchedPhotos[photo.id].push(imageFilePath);        
      //   }
      // }
      // else if (photos.length === 1) {
      if (photos.length === 1) {
        if (!googlePhotoIdsToMatchedPhotos.hasOwnProperty(photos[0].id)) {
          googlePhotoIdsToMatchedPhotos[photos[0].id] = [];
        }
        googlePhotoIdsToMatchedPhotos[photos[0].id].push(
          {
            imageFilePath,
            exactMatch: true
          }
        );
        matchResultsType.singleNameMatchesFound++;
      } else if (photos.length === 0) {
        matchResultsType.noNameMatchesFound++;
        filePathsNoNameMatchesFound.push(imageFilePath);
        // writeToWriteStream(filePathsNoNameMatchesFoundStream, imageFilePath);
      } else {
        const matchedId: string = await getMatchedDateTimePhotoWithSameName(imageFilePath, photos);
        if (matchedId !== '') {
          if (!googlePhotoIdsToMatchedPhotos.hasOwnProperty(matchedId)) {
            googlePhotoIdsToMatchedPhotos[matchedId] = [];
          }
          googlePhotoIdsToMatchedPhotos[matchedId].push(
            {
              imageFilePath,
              exactMatch: false
            }
          );
        }
        // const resultType: MatchResultType = await getDateTimeMatchForPhotosWithSameName(imageFilePath, photos);
        // switch (resultType) {
        //   case MatchResultType.MinMatchFound:
        //     console.log(googlePhotoIdsToMatchedPhotos);
        //     dateTimeMatchResultsType.dateTimeWithinMinFound++;
        //     matchResultsType.dateMatchFoundInMultiple++;
        //     break;
        //   case MatchResultType.MaxMatchFound:
        //     dateTimeMatchResultsType.dateTimeWithinMaxFound++;
        //     matchResultsType.dateMatchFoundInMultiple++;
        //     break;
        //   case MatchResultType.TimeZoneMatchFound:
        //     dateTimeMatchResultsType.dateTimeZoneMatchFound++;
        //     matchResultsType.dateMatchFoundInMultiple++;
        //     break;
        //   case MatchResultType.NoMatchFound:
        //     dateTimeMatchResultsType.noDateTimeMatchFound++;
        //     matchResultsType.noDateMatchFoundInMultiple++;
        //     filePathsNoDateMatchesFound.push(imageFilePath);
        //     writeToWriteStream(filePathsNoDateMatchesFoundStream, imageFilePath);
        //     break;
        //   case MatchResultType.NoDateFound:
        //   default:
        //     dateTimeMatchResultsType.noDateTimeDataCount++;
        //     matchResultsType.noDateMatchFoundInMultiple++;
        //     break;
        // }
      }

      fileCount++;

    } catch (error) {
      console.log('runMatchExperiments Error: ', error);
    }
  }

  debugger;

  const googlePhotoIdsToMatchedPhotosAsStr = JSON.stringify(googlePhotoIdsToMatchedPhotos);
  // writeToWriteStream(googlePhotoIdsToMatchedPhotosStream, googlePhotoIdsToMatchedPhotosAsStr);
  closeStream(googlePhotoIdsToMatchedPhotosStream);

  // closeStream(filePathsNoNameMatchesFoundStream);
  // closeStream(filePathsNoDateMatchesFoundStream);

  console.log(matchResultsType);
  console.log(dateTimeMatchResultsType);
  console.log(filePathsNoNameMatchesFound);
  console.log(filePathsNoDateMatchesFound);
}

const analyzeGooglePhotoIdsToMatchedPhotos = async () => {

  const totalMatches = Object.keys(googlePhotoIdsToMatchedPhotos).length;

  let singleMatchesCount = 0;
  let singleMatchExactCount = 0;
  let singleMatchByDateCount = 0;

  let multipleMatchesCount = 0;
  let multipleMatchesAllExact = 0;
  let multipleMatchesAllDate = 0;
  let multipleMatchesNotSameType = 0;
  let multipleMatchesFilePathIncludesPhotosFrom = 0;

  for (const googleId in googlePhotoIdsToMatchedPhotos) {
    if (Object.prototype.hasOwnProperty.call(googlePhotoIdsToMatchedPhotos, googleId)) {
      const matchedPhotos: MatchedPhoto[] = googlePhotoIdsToMatchedPhotos[googleId];
      if (matchedPhotos.length === 1) {
        singleMatchesCount++;
        if (matchedPhotos[0].exactMatch) {
          singleMatchExactCount++;
        } else {
          singleMatchByDateCount++;
        }
      } else {
        multipleMatchesCount++;
        let initialMatchType: boolean = matchedPhotos[0].exactMatch;
        let allMatchTypesIdentical = true;
        let includesPhotosFrom = false;
        for (const matchedPhoto of matchedPhotos) {
          if (matchedPhoto.exactMatch !== initialMatchType) {
            allMatchTypesIdentical = false;
          }
          if (!matchedPhoto.exactMatch && matchedPhotos[0].imageFilePath.includes('Photos from')) {
            includesPhotosFrom = true;
          }
        }
        if (allMatchTypesIdentical) {
          if (initialMatchType) {
            multipleMatchesAllExact++
          } else {
            multipleMatchesAllDate++;
          }
        } else {
          multipleMatchesNotSameType++;
        }
        if (includesPhotosFrom) {
          multipleMatchesFilePathIncludesPhotosFrom++;
        }
      }

    }
  }

  debugger;

  console.log('Total number of matches:');
  console.log('\t' + totalMatches);

  console.log('Matches to a single takeout file:');
  console.log('\t', singleMatchesCount);
  console.log('\t', singleMatchExactCount);
  console.log('\t', singleMatchByDateCount);

  console.log('Matches to multiple takeout files:');
  console.log('\t', multipleMatchesCount);
  console.log('\t', multipleMatchesAllExact);
  console.log('\t', multipleMatchesAllDate);
  console.log('\t', multipleMatchesNotSameType);
  console.log('\t', multipleMatchesFilePathIncludesPhotosFrom);
}
const getMatchedDateTimePhotoWithSameName = async (imageFilePath: string, photos: GPhotosMediaItem[]): Promise<string> => {

  for (const photo of photos) {
    const resultType: MatchResultType = await getDateTimeMatchResultsType(photo.creationTime, imageFilePath);
    switch (resultType) {
      case MatchResultType.MinMatchFound:
        return photo.id;
      default:
        break;
    }
  }
  return '';
}


const getDateTimeMatchForPhotosWithSameName = async (imageFilePath: string, photos: GPhotosMediaItem[]): Promise<MatchResultType> => {

  let maxMatchFound = false;
  let timeZoneMatchFound = false;
  let dateFound = false;

  for (const photo of photos) {
    const resultType: MatchResultType = await getDateTimeMatchResultsType(photo.creationTime, imageFilePath);
    switch (resultType) {
      case MatchResultType.MinMatchFound:
        return MatchResultType.MinMatchFound;
      case MatchResultType.TimeZoneMatchFound:
        timeZoneMatchFound = true;
        break;
      case MatchResultType.MaxMatchFound:
        maxMatchFound = true;
        break;
      case MatchResultType.NoMatchFound:
        dateFound = true;
        break;
      case MatchResultType.NoDateFound:
      default:
        break;
    }
  }
  if (maxMatchFound) {
    return MatchResultType.MaxMatchFound;
  } else if (timeZoneMatchFound) {
    return MatchResultType.TimeZoneMatchFound;
  } else if (dateFound) {
    return MatchResultType.NoMatchFound;
  } else {
    return MatchResultType.NoDateFound;
  }
}

const max = 1000;
const min = 100;

// timezone differences not accounted for - another test could be
/*
  minutes = exifData.<date>
  seconds = exifData.<seconds>
  gdt = new Date(gPhotoCreationTime)
  gMinutes = gdt.getMinutes()
  gSeconds = gdt.getSeconds()
  do comparison
*/

const getDateTimeMatchResultsType = async (gPhotoCreationTimeSpec: string, filePath: string): Promise<MatchResultType> => {

  let dateTimeOriginalTs: number;
  let modifyDateTs: number;
  let createDateTs: number;

  const gPhotoCreationTime: number = Date.parse(gPhotoCreationTimeSpec);
  const gDateTime = new Date(gPhotoCreationTime);
  const gMinutes = gDateTime.getMinutes();
  const gSeconds = gDateTime.getSeconds();

  const exifData: Tags = await getExifData(filePath);

  let maxMatchFound = false;
  let timeZoneMatchFound = false;
  let exifDateTimeFound = false;

  let minutes = -1;
  let seconds = -1;

  dateTimeOriginalTs = getDateTimeSinceZero(exifData.DateTimeOriginal);
  if (dateTimeOriginalTs >= 0) {
    exifDateTimeFound = true;
    if (Math.abs(gPhotoCreationTime - dateTimeOriginalTs) < min) {
      return MatchResultType.MinMatchFound;
    } else if (Math.abs(gPhotoCreationTime - dateTimeOriginalTs) < max) {
      maxMatchFound = true;
    } else {
      if (isObject(exifData.DateTimeOriginal)) {
        minutes = (exifData.DateTimeOriginal as ExifDateTime).minute;
        seconds = (exifData.DateTimeOriginal as ExifDateTime).second;
        if (minutes === gMinutes && seconds === gSeconds) {
          timeZoneMatchFound = true;
        }
      }
    }
  }

  modifyDateTs = getDateTimeSinceZero(exifData.ModifyDate);
  if (modifyDateTs >= 0) {
    exifDateTimeFound = true;
    if (Math.abs(gPhotoCreationTime - modifyDateTs) < min) {
      return MatchResultType.MinMatchFound;
    } else if (Math.abs(gPhotoCreationTime - modifyDateTs) < max) {
      maxMatchFound = true;
    } else {
      if (isObject(exifData.ModifyDate)) {
        minutes = (exifData.ModifyDate as ExifDateTime).minute;
        seconds = (exifData.ModifyDate as ExifDateTime).second;
        if (minutes === gMinutes && seconds === gSeconds) {
          timeZoneMatchFound = true;
        }
      }
    }
  }

  createDateTs = getDateTimeSinceZero(exifData.CreateDate);
  if (createDateTs >= 0) {
    exifDateTimeFound = true;
    if (Math.abs(gPhotoCreationTime - createDateTs) < min) {
      return MatchResultType.MinMatchFound;
    } else if (Math.abs(gPhotoCreationTime - createDateTs) < max) {
      maxMatchFound = true;
    } else {
      if (isObject(exifData.CreateDate)) {
        minutes = (exifData.CreateDate as ExifDateTime).minute;
        seconds = (exifData.CreateDate as ExifDateTime).second;
        if (minutes === gMinutes && seconds === gSeconds) {
          timeZoneMatchFound = true;
        }
      }
    }
  }

  if (maxMatchFound) {
    return MatchResultType.MaxMatchFound;
  } else if (timeZoneMatchFound) {
    return MatchResultType.TimeZoneMatchFound;
  } else {
    if (exifDateTimeFound) {
      // debugger;
      return MatchResultType.NoMatchFound;
    } else {
      return MatchResultType.NoDateFound;
    }

  }
}

const mediaItemByTimezone: any = {};
let mediaItemsWithTimezone = 0;
let exifDateTimesWithoutTimezone = 0;
let mediaItemsCounted = 0;

const getDateTimeSinceZero = (dt: any): number => {
  mediaItemsCounted++;
  let ts = -1;
  try {
    if (!isNil(dt)) {
      if (isString(dt)) {
        ts = Date.parse(dt);
      } else {
        ts = Date.parse((dt as ExifDateTime).toISOString());
        if (isNumber((dt as ExifDateTime).tzoffsetMinutes)) {
          const key: string = (dt as ExifDateTime).tzoffsetMinutes.toString();
          if (!mediaItemByTimezone.hasOwnProperty(key)) {
            mediaItemByTimezone[key] = 0;
          }
          mediaItemByTimezone[key] = mediaItemByTimezone[key] + 1;
          mediaItemsWithTimezone++;
        } else {
          exifDateTimesWithoutTimezone++;
        }
      }
    }
  } catch (error) {
    console.log('getDateTimeSinceZero error: ', error);
    console.log('dt: ', dt);
  }

  return ts;
}

