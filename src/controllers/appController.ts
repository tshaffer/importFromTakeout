import { getImageFiles } from './fsUtils';
import { getExifData } from './exifUtils';

import {
  DbMediaItem
} from '../types';

import {
  addMediaItemToDb
} from '../controllers';

import { mediaItemsDir } from '../app';


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

  try {
    // for each image file path
    for (const imageFile of imageFiles) {
      
      // get exif data
      const exifData = await getExifData(imageFile);
      console.log(exifData);

      // get sha1
      
      // get destination file path from root directory, sha1
      
      // copy file to destination path
      
      // add record to db
      const dbMediaItem: DbMediaItem = {
        fileName: imageFile,
      };
      const retVal: any = await addMediaItemToDb(dbMediaItem);
      console.log(retVal);
      // retVal._id.toString()

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

