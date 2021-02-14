import {
  ExifData,
  ExifImage,
} from 'exif';

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

