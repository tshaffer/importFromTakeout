import fs from 'fs';
import path from 'path';

import { closeStream, getFileName, getFilePath, getImageFilePaths, openReadStream, openWriteStream, readStream, writeJsonToFile, writeToWriteStream } from './fsUtils';
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
  DbMediaItem, GoogleMediaItem, GPhotosMediaItem, MatchResultsType,
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
import { findMe, findGPhotosByName, findGPhotosByNameStartsWith } from './dbInterface';
import { isNil, isNumber, isObject, isString } from 'lodash';
import { AuthService } from '../auth';
import { FSWatcher } from 'fs-extra';

// maps photo id to list of file paths that matched it
interface MatchedPhoto {
  imageFilePath: string;
  exactMatch: boolean;
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

  debugger;
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

const matchGooglePhotosToTakeoutPhotos = async () => {

  const googleMediaItemsById: IdToGoogleMediaItems = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/googleMediaItemsById.json');
  const takeoutFilesByFileName: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByFileName.json');
  const takeoutFilesByCreateDate: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByCreateDate.json');
  const takeoutFilesByDateTimeOriginal: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByDateTimeOriginal.json');
  const takeoutFilesByModifyDate: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByModifyDate.json');
  const takeoutFilesByImageDimensions: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByImageDimensions.json');

  let uniqueFileNameMatches = 0;
  let singleDateMatches = 0;
  let multipleDateMatches = 0;
  let noDateMatches = 0;
  let multipleFileNameMatches = 0;
  let noFileNameMatch = 0;

  let noTakeoutFilesWithSameDimensions = 0;
  let singleTakeoutFilesWithSameDimensions = 0;
  let multipleTakeoutFilesWithSameDimensions = 0;

  const matchedGoogleMediaItems: IdToMatchedGoogleMediaItem = {};
  const unmatchedGoogleMediaItems: GoogleMediaItem[] = [];

  for (const key in googleMediaItemsById) {
    if (Object.prototype.hasOwnProperty.call(googleMediaItemsById, key)) {
      const googleMediaItems: GoogleMediaItem[] = googleMediaItemsById[key];
      for (const googleMediaItem of googleMediaItems) {

        if (takeoutFilesByFileName.hasOwnProperty(googleMediaItem.filename)) {
          
          const takeoutFilePaths: string[] = takeoutFilesByFileName[googleMediaItem.filename];
          
          if (takeoutFilePaths.length === 1) {
            // unique file name match found
            uniqueFileNameMatches++;
            matchedGoogleMediaItems[googleMediaItem.id] = {
              takeoutFilePath: takeoutFilePaths[0],
              googleMediaItem
            };
          
          } else {
            // multiple file names match; look for a date match
            const matchedTakeoutFile: string = getTakeoutFileWithMatchingNameAndDate(
              googleMediaItem,
              takeoutFilePaths,
              takeoutFilesByCreateDate,
              takeoutFilesByDateTimeOriginal,
              takeoutFilesByModifyDate,
            );
            if (matchedTakeoutFile !== '') {
              matchedGoogleMediaItems[googleMediaItem.id] = {
                takeoutFilePath: matchedTakeoutFile,
                googleMediaItem
              };
            }
            multipleFileNameMatches++;
          }
        } else {
          noFileNameMatch++;
          unmatchedGoogleMediaItems.push(googleMediaItem);
        }
      }
    }
  }

  // see if there is a takeout file whose dates match any of the unmatched google media items
  for (const unmatchedGoogleMediaItem of unmatchedGoogleMediaItems) {
    const matchedTakeoutFile: string = getTakeoutFileWithMatchingNameAndDate(
      unmatchedGoogleMediaItem,
      [],
      takeoutFilesByCreateDate,
      takeoutFilesByDateTimeOriginal,
      takeoutFilesByModifyDate,
    );
  }

  console.log('');
  console.log('total number of googleMediaItems = ', Object.keys(googleMediaItemsById).length);
  console.log('unique matches found = ', uniqueFileNameMatches + singleDateMatches);
  console.log('number unaccounted for = ', Object.keys(googleMediaItemsById).length - (uniqueFileNameMatches + singleDateMatches));

  console.log('matchedGoogleMediaItems count = ', Object.keys(matchedGoogleMediaItems).length);
  console.log('unmatchedGoogleMediaItems count = ', unmatchedGoogleMediaItems.length);


  console.log('');
  console.log('uniqueFileNameMatches = ', uniqueFileNameMatches);
  console.log('');

  console.log('multipleFileNameMatches = ', multipleFileNameMatches);
  console.log('singleDateMatches = ', singleDateMatches);
  console.log('multipleDateMatches = ', multipleDateMatches);
  console.log('noDateMatches = ', noDateMatches);

  console.log('');
  console.log('noFileNameMatches = ', noFileNameMatch);

  console.log('');
  console.log('noTakeoutFilesWithSameDimensions = ', noTakeoutFilesWithSameDimensions);
  console.log('singleTakeoutFilesWithSameDimensions = ', singleTakeoutFilesWithSameDimensions);
  console.log('multipleTakeoutFilesWithSameDimensions = ', multipleTakeoutFilesWithSameDimensions);

  debugger;
}

const getTakeoutFileWithMatchingNameAndDate = (
  googleMediaItem: GoogleMediaItem,
  takeoutFilePaths: string[],
  takeoutFilesByCreateDate: any,
  takeoutFilesByDateTimeOriginal: any,
  takeoutFilesByModifyDate: any,
): string => {

  const creationTimeKey = Date.parse(googleMediaItem.mediaMetadata.creationTime as unknown as string).toString();

  let matchingDateTakeoutFiles: string[] = getTakeoutFilesMatchingGoogleDate(takeoutFilesByCreateDate, creationTimeKey, takeoutFilePaths);

  if (matchingDateTakeoutFiles.length !== 1) {
    if (matchingDateTakeoutFiles.length === 0) {
      matchingDateTakeoutFiles = getTakeoutFilesMatchingGoogleDate(takeoutFilesByDateTimeOriginal, creationTimeKey, takeoutFilePaths);
      if (matchingDateTakeoutFiles.length !== 1) {
        if (matchingDateTakeoutFiles.length === 0) {
          matchingDateTakeoutFiles = getTakeoutFilesMatchingGoogleDate(takeoutFilesByModifyDate, creationTimeKey, takeoutFilePaths);
        }
      }
    }
  }

  if (matchingDateTakeoutFiles.length === 1) {
    return matchingDateTakeoutFiles[0];
  }

  return '';
}




const getNonDateExifMatch = async (
  googleMediaItem: GoogleMediaItem,
  takeoutFilePaths: string[],
): Promise<string[]> => {

  // iterate through the takeout files that have the same name, same date 

  const takeoutFilesWithSameDimensions: string[] = [];

  for (const takeoutFilePath of takeoutFilePaths) {
    const exifData: Tags = await getExifData(takeoutFilePath);
    // console.log('Tags for takeoutFilePath: ', takeoutFilePath);
    // console.log(exifData);
    if (isObject(googleMediaItem.mediaMetadata)) {
      if (isString(googleMediaItem.mediaMetadata.width)) {
        const gWidth = Number(googleMediaItem.mediaMetadata.width);
        if (!isNaN(gWidth)) {
          if (isString(googleMediaItem.mediaMetadata.height)) {
            const gHeight = Number(googleMediaItem.mediaMetadata.height);
            if (!isNaN(gHeight)) {
              if (isNumber(exifData.ImageWidth) && exifData.ImageWidth === gWidth && isNumber(exifData.ImageHeight) && exifData.ImageHeight === gHeight) {
                takeoutFilesWithSameDimensions.push(takeoutFilePath);
              } else if (isNumber(exifData.ExifImageWidth) && exifData.ExifImageWidth === gWidth && isNumber(exifData.ExifImageHeight) && exifData.ExifImageHeight === gHeight) {
                takeoutFilesWithSameDimensions.push(takeoutFilePath);
              }
              // check for portrait mode where width and height are swapped
              else if (isNumber(exifData.ImageWidth) && exifData.ImageWidth === gHeight && isNumber(exifData.ImageHeight) && exifData.ImageHeight === gWidth) {
                takeoutFilesWithSameDimensions.push(takeoutFilePath);
              } else if (isNumber(exifData.ExifImageWidth) && exifData.ExifImageWidth === gHeight && isNumber(exifData.ExifImageHeight) && exifData.ExifImageHeight === gWidth) {
                takeoutFilesWithSameDimensions.push(takeoutFilePath);
              }
            }
          }
        }
      }
    }
  }

  if (takeoutFilesWithSameDimensions.length <= 1) {
    console.log('gMediaItem: ', googleMediaItem.filename);
    console.log('takeoutFiles');
    console.log('takeoutFilesWithSameDimensions');
    console.log(takeoutFilesWithSameDimensions);

  }
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
    const takeoutFilesWithSameNameAndDate: string[] = [];
    const takeoutFilesWithSameDate: string[] = takeoutFilesByDate[dt];
    if (takeoutFilesWithSameDate.length > 0) {
      debugger;
    }
    for (const matchingTakeoutFile of takeoutFilesWithSameDate) {
      if (takeoutFilePaths.indexOf(matchingTakeoutFile) === 0) {
        takeoutFilesWithSameNameAndDate.push(matchingTakeoutFile);
      }
    }
    return takeoutFilesWithSameNameAndDate;
  }

  return [];
}

const runMatchExperiments = async (authService: AuthService) => {

  await matchGooglePhotosToTakeoutPhotos();
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

const getDateTimeSinceZero = (dt: any): number => {
  let ts = -1;
  try {
    if (!isNil(dt)) {
      if (isString(dt)) {
        ts = Date.parse(dt);
      } else {
        ts = Date.parse((dt as ExifDateTime).toISOString());
      }
    }
  } catch (error) {
    console.log('getDateTimeSinceZero error: ', error);
    console.log('dt: ', dt);
  }

  return ts;
}

