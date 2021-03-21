import fs from 'fs';
import path from 'path';

import { closeStream, getImageFilePaths, openReadStream, openWriteStream, readStream, writeJsonToFile, writeToWriteStream } from './fsUtils';
import {
  getExifData,
  missingExifDataCount,
  missingImageSizeDataCount,
  missingImageSizeKeyCount,
} from './exifUtils';

import {
  ExifDateTime,
  Tags
} from 'exiftool-vendored';


import {
  GoogleMediaItem, GoogleMediaMetadata, GooglePhoto, MatchResultsType,
} from '../types';

import { isNil, isNumber, isObject, isString } from 'lodash';

// maps photo id to list of file paths that matched it
interface MatchedPhoto {
  imageFilePath: string;
  exactMatch: boolean;
}

interface FilePathToExifTags {
  [key: string]: Tags;
}

interface MatchFileNameResults {
  matchedGoogleMediaItems: IdToMatchedGoogleMediaItem;
  unmatchedGoogleMediaItems: IdToGoogleMediaItems;
  googleMediaItemsToMultipleTakeoutFiles: IdToStringArray;
}

interface MatchToDateTimeResults {
  unmatchedGoogleMediaItems: GoogleMediaItem[];
}

interface ThirdPassResults {
  remainingUnmatchedGoogleMediaItemsNoFileNameMatches: GoogleMediaItem[];
  remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches: GoogleMediaItem[];
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
type IdToStringArray = {
  [key: string]: string[]
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

const unusedExtension: string[] = ['.mov', '.mp4', '.bmp', '.mpg', '.nef'];

export const runApp = () => {

  // comment out standard functionality to try matching experiments
  // importImageFiles();

  matchGooglePhotosToTakeoutFiles();
}

const getJsonFromFile = async (filePath: string): Promise<any> => {
  const readFileStream: fs.ReadStream = openReadStream(filePath);
  const fileContents: string = await readStream(readFileStream);
  const jsonObject: IdToMatchedPhotoArray = JSON.parse(fileContents);
  return jsonObject;
}

const roundToNearestTenth = (valIn: number): number => {
  return Math.round(valIn * 10) / 10;
}

const matchTags = (googleMediaItem: GoogleMediaItem, exifData: Tags): boolean => {

  if (isString(googleMediaItem.mimeType) && googleMediaItem.mimeType !== '') {
    if (isString(exifData.MIMEType)) {
      if (exifData.MIMEType.toLowerCase() !== googleMediaItem.mimeType.toLowerCase()) {
        return false;
      }
    }
  }
  if (isObject(googleMediaItem.mediaMetadata)) {

    const mediaMetadata: GoogleMediaMetadata = googleMediaItem.mediaMetadata;

    if (isString(mediaMetadata.width) && isString(mediaMetadata.height)) {
      if (isNumber(exifData.ImageWidth) && isNumber(exifData.ImageHeight)) {
        if (Number(mediaMetadata.width) !== exifData.ImageWidth || Number(mediaMetadata.width) !== exifData.ImageWidth) {
          return false;
        }
      }
    }

    if (isObject(mediaMetadata.photo)) {

      const photoMetadata: GooglePhoto = mediaMetadata.photo;

      if (isNumber(photoMetadata.apertureFNumber)) {
        if (isNumber(exifData.Aperture) && roundToNearestTenth(exifData.Aperture) !== roundToNearestTenth(photoMetadata.apertureFNumber)) {
          return false;
        }
      }

      if (isString(photoMetadata.cameraMake)) {
        if (isString(exifData.Make) && exifData.Make !== photoMetadata.cameraMake) {
          return false;
        }
      }

      if (isString(photoMetadata.cameraModel)) {
        if (isString(exifData.Model) && exifData.Model !== photoMetadata.cameraModel) {
          return false;
        }
      }

      // if (isNumber(photoMetadata.focalLength)) {
      //   // exifData rounds it off
      // }

      if (isNumber(photoMetadata.isoEquivalent)) {
        if (isNumber(exifData.ISO) && exifData.ISO !== photoMetadata.isoEquivalent) {
          return false;
        }
      }
    }

  } else {
    return false;
  }

  return true;
}

const retrieveExifData = async(filePath: string): Promise<any> => {
  let exifData: Tags;
  if (filePathsToExifTags.hasOwnProperty(filePath)) {
    exifData = filePathsToExifTags[filePath];
  } else {
    exifData = await getExifData(filePath);
    filePathsToExifTags[filePath] = exifData;
  }
  return exifData;
}

const getTagsMatch = async (googleMediaItem: GoogleMediaItem, takeoutFiles: string[]): Promise<string> => {

  for (const takeoutFile of takeoutFiles) {
    const exifData: Tags = retrieveExifData(takeoutFile) as Tags;
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

const trimUnusedMediaItems = async (googleMediaItemsById: IdToGoogleMediaItems,
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

const matchToFileNames = async (
  googleMediaItemsById: IdToGoogleMediaItems,
  takeoutFilesByFileName: IdToStringArray)
  : Promise<MatchFileNameResults> => {

  const matchedGoogleMediaItems: IdToMatchedGoogleMediaItem = {};
  const unmatchedGoogleMediaItems: IdToGoogleMediaItems = {};
  const googleMediaItemsToMultipleTakeoutFiles: IdToStringArray = {};

  let googleMediaItemsCount = 0;

  for (const key in googleMediaItemsById) {
    if (Object.prototype.hasOwnProperty.call(googleMediaItemsById, key)) {
      const googleMediaItems: GoogleMediaItem[] = googleMediaItemsById[key];
      for (const googleMediaItem of googleMediaItems) {
        googleMediaItemsCount++;
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
  console.log(googleMediaItemsCount + '\tNumber of googleMediaItems to match');

  const results: MatchFileNameResults = {
    matchedGoogleMediaItems,
    unmatchedGoogleMediaItems,
    googleMediaItemsToMultipleTakeoutFiles
  };
  return results;
}

const matchToDateTime = async (
  matchedGoogleMediaItems: IdToMatchedGoogleMediaItem,
  unmatchedGoogleMediaItems: IdToGoogleMediaItems): Promise<MatchToDateTimeResults> => {

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

  const results: MatchToDateTimeResults = {
    unmatchedGoogleMediaItems: stillUnmatchedGoogleMediaItems
  };
  return results;
}

const matchGooglePhotosToTakeoutPhotos_3 = async (
  takeoutFilesByFileName: IdToStringArray,
  matchedGoogleMediaItems: IdToMatchedGoogleMediaItem,
  stillUnmatchedGoogleMediaItems: GoogleMediaItem[]): Promise<ThirdPassResults> => {

  const remainingUnmatchedGoogleMediaItems: GoogleMediaItem[] = [];
  const remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches: GoogleMediaItem[] = [];
  const remainingUnmatchedGoogleMediaItemsNoFileNameMatches: GoogleMediaItem[] = [];

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

  const results: ThirdPassResults = {
    remainingUnmatchedGoogleMediaItemsNoFileNameMatches,
    remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches,
  };

  return results;
}

const matchGooglePhotosToTakeoutPhotos_4 = async(
  takeoutFilesByFileName: IdToStringArray,
  remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches: GoogleMediaItem[],
): Promise<IdToGoogleMediaItem> => {

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
  const googleMediaItemsWhereAtLeastOneTakeoutFileHasGps: IdToGoogleMediaItem = {};

  for (const googleMediaItem of remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches) {
    const takeoutFilesWithSameFileName: string[] = takeoutFilesByFileName[googleMediaItem.filename];
    let filesWithNoDateTime = 0;
    let fileWithNoDateTimeHasGPS = false;
    let oneOfTakeoutFilesHasGps = false;
    for (const takeoutFilePath of takeoutFilesWithSameFileName) {
      const exifData: Tags = await retrieveExifData(takeoutFilePath);
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
  }

  return googleMediaItemsWhereAtLeastOneTakeoutFileHasGps;
}

const matchGooglePhotosToTakeoutPhotos_5 = async(
  takeoutFilesByFileName: IdToStringArray,
  matchedGoogleMediaItems: IdToMatchedGoogleMediaItem,
  googleMediaItemsWhereAtLeastOneTakeoutFileHasGps: IdToGoogleMediaItem,
): Promise<void> => {

  for (const key in googleMediaItemsWhereAtLeastOneTakeoutFileHasGps) {
    if (Object.prototype.hasOwnProperty.call(googleMediaItemsWhereAtLeastOneTakeoutFileHasGps, key)) {
      const googleMediaItem: GoogleMediaItem = googleMediaItemsWhereAtLeastOneTakeoutFileHasGps[key];
      if (takeoutFilesByFileName.hasOwnProperty(googleMediaItem.filename)) {
        const takeoutFilePaths: string[] = takeoutFilesByFileName[googleMediaItem.filename];
        for (const takeoutFilePath of takeoutFilePaths) {
          const exifData: Tags = await retrieveExifData(takeoutFilePath);
          if (!isNil(exifData.GPSLatitude)) {
            const hasDateTime: boolean = !isNil(exifData.CreateDate) || !isNil(exifData.DateTimeOriginal) || !isNil(exifData.ModifyDate);
            if (!hasDateTime) {
              matchedGoogleMediaItems[key] = {
                takeoutFilePath,
                googleMediaItem,
              };
            }
          }
        }
      }
      else {
        debugger;
      }
    }
  }
}

const matchGooglePhotosToTakeoutPhotos_6 = (
  takeoutFilesByFileName: IdToStringArray,
  matchedGoogleMediaItems: IdToMatchedGoogleMediaItem,
  remainingUnmatchedGoogleMediaItemsNoFileNameMatches: any,
) => {
  for (const googleMediaItem of remainingUnmatchedGoogleMediaItemsNoFileNameMatches) {
    const fileName = googleMediaItem.filename;
    const fileExtension: string = path.extname(fileName);

    const filePathWithoutExtension = fileName.split('.').slice(0, -1).join('.');

    const filePathWithUpperCaseExtension = filePathWithoutExtension + fileExtension.toUpperCase();
    if (takeoutFilesByFileName.hasOwnProperty(filePathWithUpperCaseExtension)) {
      matchedGoogleMediaItems[googleMediaItem.id] = {
        takeoutFilePath: filePathWithUpperCaseExtension,
        googleMediaItem,
      };
    }

    const filePathWithLowerCaseExtension = filePathWithoutExtension + fileExtension.toLowerCase();
    if (takeoutFilesByFileName.hasOwnProperty(filePathWithLowerCaseExtension)) {
      matchedGoogleMediaItems[googleMediaItem.id] = {
        takeoutFilePath: filePathWithLowerCaseExtension,
        googleMediaItem,
      };
    }
  }
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

const matchGooglePhotosToTakeoutFiles = async () => {

  const googleMediaItemsById: IdToGoogleMediaItems = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/googleMediaItemsById.json');
  const takeoutFilesByFileName: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByFileName.json');
  await readFilePathsToExifTags();

  console.log(Object.keys(googleMediaItemsById).length + '\tNumber of keys in googleMediaItemsById');
  trimUnusedMediaItems(googleMediaItemsById);
  console.log(Object.keys(googleMediaItemsById).length + '\tNumber of keys in googleMediaItemsById after trimming unused media items');

  const matchFileNameResults: MatchFileNameResults = await matchToFileNames(googleMediaItemsById, takeoutFilesByFileName);
  const { matchedGoogleMediaItems, unmatchedGoogleMediaItems, googleMediaItemsToMultipleTakeoutFiles } = matchFileNameResults;

  console.log('');
  console.log('Match file names');
  console.log(Object.keys(matchedGoogleMediaItems).length + '\tMatched google media items')
  console.log(Object.keys(unmatchedGoogleMediaItems).length + '\tUnmatched google media items')

  const matchToDateTimeResults: MatchToDateTimeResults = await matchToDateTime(matchedGoogleMediaItems, unmatchedGoogleMediaItems);
  const stillUnmatchedGoogleMediaItems = matchToDateTimeResults.unmatchedGoogleMediaItems;

  console.log('');
  console.log('Match to date/time');
  console.log(Object.keys(matchedGoogleMediaItems).length + '\tMatched google media items')
  console.log(Object.keys(stillUnmatchedGoogleMediaItems).length + '\tUnmatched google media items')

  const thirdPassResults: ThirdPassResults = await matchGooglePhotosToTakeoutPhotos_3(takeoutFilesByFileName, matchedGoogleMediaItems, stillUnmatchedGoogleMediaItems);
  const { remainingUnmatchedGoogleMediaItemsNoFileNameMatches, remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches } = thirdPassResults;
  console.log('');
  console.log('Match to truncated file names');
  console.log(Object.keys(matchedGoogleMediaItems).length + '\tMatched google media items')
  console.log(remainingUnmatchedGoogleMediaItemsNoFileNameMatches.length, '\tremainingUnmatchedGoogleMediaItemsNoFileNameMatches');
  console.log(remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches.length, '\tremainingUnmatchedGoogleMediaItemsMultipleFileNameMatches');
  
  const googleMediaItemsWhereAtLeastOneTakeoutFileHasGps: IdToGoogleMediaItem = await matchGooglePhotosToTakeoutPhotos_4(takeoutFilesByFileName, thirdPassResults.remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches);
  
  await matchGooglePhotosToTakeoutPhotos_5(takeoutFilesByFileName, matchedGoogleMediaItems, googleMediaItemsWhereAtLeastOneTakeoutFileHasGps);
  console.log('');
  console.log('Match to files with GPS data');
  console.log(Object.keys(matchedGoogleMediaItems).length + '\tMatched google media items')

  matchGooglePhotosToTakeoutPhotos_6(takeoutFilesByFileName, matchedGoogleMediaItems, thirdPassResults.remainingUnmatchedGoogleMediaItemsNoFileNameMatches);
  console.log('');
  console.log('Match to files with mismatched file extensions');
  console.log(Object.keys(matchedGoogleMediaItems).length + '\tMatched google media items')
  // console.log('sixthPassResults');
  // console.log(Object.keys(matchedGoogleMediaItems).length);
  debugger;

}
