import { getImageFiles } from './fsUtils';
import { exifToDbItem, getExifData } from './exifUtils';

import {
  DbMediaItem
} from '../types';

import {
  addMediaItemToDb
} from '../controllers';

import { mediaItemsDir } from '../app';
import { ExifData } from 'exif';


export const runApp = () => {
  importImageFiles();
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
  const imageFiles = getImageFiles(mediaItemsDir);
  console.log(imageFiles);

  let imageCount = 0;

  try {
    // for each image file path
    for (const imageFile of imageFiles) {

      const imageFilePath = imageFile;
      // const imageFilePath = '/Volumes/SHAFFEROTO/takeout/unzipped/Takeout 15/Google Photos/Photos from 2020/IMG_4464.JPG';
      // const imageFilePath = '/Volumes/SHAFFEROTO/takeout/unzipped/Takeout 1/Google Photos/Summer 2018/IMG_3146.JPG';

      // get exif data
      const exifData = await getExifData(imageFilePath);
      const dbMediaItem: DbMediaItem = exifToDbItem(imageFilePath, exifData);

      // get sha1

      // get destination file path from root directory, sha1

      // copy file to destination path

      // add record to db
      const retVal: any = await addMediaItemToDb(dbMediaItem);
      // const dbRecordId: string = retVal.insertedId._id.toString();

      imageCount++;
      if (imageCount > 10) {
        debugger;
      }
    }
  } catch (error) {
    console.log('Error: ', error);
    debugger;
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

