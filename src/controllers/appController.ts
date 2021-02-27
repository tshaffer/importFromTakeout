import { closeStream, getFileName, getFilePath, getImageFilePaths, openReadStream, openWriteStream, readStream, writeToWriteStream } from './fsUtils';
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

// maps photo id to list of file paths that matched it
interface MatchedPhoto {
  imageFilePath: string;
  exactMatch: boolean;
}
type IdToStringArray = {
  [key: string]: MatchedPhoto[]
}
type IdToObject = {
  [key: string]: any
}
type IdToAnyArray = {
  [key: string]: any[]
}

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

  console.log(googleMediaItemsById);
  debugger;
  console.log(googleMediaItemsById);
}

const runMatchExperiments = async (authService: AuthService) => {

  await getGooglePhotoInfo(authService);

  const filePathsNoNameMatchesFoundStream: any = openWriteStream('/Volumes/SHAFFEROTO/takeout/unzipped/noFileNameMatches.txt');
  const filePathsNoDateMatchesFoundStream: any = openWriteStream('/Volumes/SHAFFEROTO/takeout/unzipped/noDateTimeMatches.txt');
  // const googlePhotoIdsToMatchedPhotosStream: any = openWriteStream('/Volumes/SHAFFEROTO/takeout/unzipped/googlePhotoIdsToMatchedPhotos.json');


  const googlePhotoIdsToMatchedPhotosStream: any = openReadStream('/Volumes/SHAFFEROTO/takeout/unzipped/googlePhotoIdsToMatchedPhotos.json');
  const googlePhotoIdsToMatchedPhotosStr: string = await readStream(googlePhotoIdsToMatchedPhotosStream);
  const googlePhotoIdsToMatchedPhotos: IdToStringArray = JSON.parse(googlePhotoIdsToMatchedPhotosStr);

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
        writeToWriteStream(filePathsNoNameMatchesFoundStream, imageFilePath);
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
  writeToWriteStream(googlePhotoIdsToMatchedPhotosStream, googlePhotoIdsToMatchedPhotosAsStr);
  closeStream(googlePhotoIdsToMatchedPhotosStream);

  closeStream(filePathsNoNameMatchesFoundStream);
  closeStream(filePathsNoDateMatchesFoundStream);

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
  if (!isNil(dt)) {
    if (isString(dt)) {
      ts = Date.parse(dt);
    } else {
      ts = Date.parse((dt as ExifDateTime).toISOString());
    }
  }
  return ts;
}

