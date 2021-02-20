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
  DbMediaItem, GPhotosMediaItem, MatchResultsType,
  MatchResultType,
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
};

const runMatchExperiments = async () => {

  let fileCount = 0;

  const imageFilePaths: string[] = getImageFilePaths(mediaItemsDir);

  for (const imageFilePath of imageFilePaths) {

    if (fileCount >= 10) {
      debugger;
      console.log(matchResultsType);
      console.log(dateTimeMatchResultsType);
    }

    try {

      const imageFileName: string = getFileName(imageFilePath);
      const photos: GPhotosMediaItem[] = await findGPhotosByName(imageFileName);

      if (photos.length === 1) {
        matchResultsType.singleNameMatchesFound++;
      } else if (photos.length === 0) {
        matchResultsType.noNameMatchesFound++;
      } else {
        const resultType: MatchResultType = await getDateTimeMatchForPhotosWithSameName(imageFilePath, photos);
        switch (resultType) {
          case MatchResultType.MinMatchFound:
            dateTimeMatchResultsType.dateTimeWithinMinFound++;
            matchResultsType.dateMatchFoundInMultiple++;
            break;
          case MatchResultType.MaxMatchFound:
            dateTimeMatchResultsType.dateTimeWithinMaxFound++;
            matchResultsType.dateMatchFoundInMultiple++;
            break;
          case MatchResultType.NoMatchFound:
            dateTimeMatchResultsType.noDateTimeMatchFound++;
            matchResultsType.noDateMatchFoundInMultiple++;
            break;
          case MatchResultType.NoDateFound:
          default:
            dateTimeMatchResultsType.noDateTimeDataCount++;
            matchResultsType.noDateMatchFoundInMultiple++;
            break;
        }
      }

      fileCount++;

  } catch (error) {
    console.log('runMatchExperiments Error: ', error);
  }
}
}

const getDateTimeMatchForPhotosWithSameName = async (imageFilePath: string, photos: GPhotosMediaItem[]): Promise<MatchResultType> => {
  
  let maxMatchFound = false;
  let dateFound = false;

  for (const photo of photos) {
    const resultType: MatchResultType = await getDateTimeMatchResultsType(photo.creationTime, imageFilePath);
    switch (resultType) {
      case MatchResultType.MinMatchFound:
        return MatchResultType.MinMatchFound;
      case MatchResultType.MaxMatchFound:
        maxMatchFound = true;
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
  }
  else if (dateFound) {
    return MatchResultType.NoMatchFound;
  } else {
    return MatchResultType.NoDateFound;
  }
}

const max = 1000;
const min = 100;

const getDateTimeMatchResultsType = async (gPhotoCreationTimeSpec: string, filePath: string): Promise<MatchResultType> => {

  let ts: number;

  const gPhotoCreationTime: number = Date.parse(gPhotoCreationTimeSpec);

  const exifData: Tags = await getExifData(filePath);

  let maxMatchFound = false;
  let exifDateTimeFound = false;

  ts = getDateTimeSinceZero(exifData.DateTimeOriginal);
  if (ts >= 0) {
    exifDateTimeFound = true;
    if (Math.abs(gPhotoCreationTime - ts) < min) {
      return MatchResultType.MinMatchFound;
    } else if (Math.abs(gPhotoCreationTime - ts) < max) {
      maxMatchFound = true;
    }
  }

  ts = getDateTimeSinceZero(exifData.ModifyDate);
  if (ts >= 0) {
    exifDateTimeFound = true;
    if (Math.abs(gPhotoCreationTime - ts) < min) {
      return MatchResultType.MinMatchFound;
    } else if (Math.abs(gPhotoCreationTime - ts) < max) {
      maxMatchFound = true;
    }
  }

  ts = getDateTimeSinceZero(exifData.CreateDate);
  if (ts >= 0) {
    exifDateTimeFound = true;
    if (Math.abs(gPhotoCreationTime - ts) < min) {
      return MatchResultType.MinMatchFound;
    } else if (Math.abs(gPhotoCreationTime - ts) < max) {
      maxMatchFound = true;
    }
  }

  if (maxMatchFound) {
    return MatchResultType.MaxMatchFound;
  }
  else if (exifDateTimeFound) {
    return MatchResultType.NoMatchFound;
  } else {
    return MatchResultType.NoDateFound;
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

