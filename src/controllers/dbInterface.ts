import { DbMediaItem } from "../types";
import Mediaitem from '../models/Mediaitem';
import { Model, Query, Document } from "mongoose";

export const addMediaItemToDb = async (dbMediaItem: DbMediaItem): Promise<string> => {
  return Mediaitem.collection.insertOne(dbMediaItem)
    .then((retVal: any) => {
      const dbRecordId: string = retVal.insertedId._id.toString();
      return dbRecordId;
    })
};

export const setMediaItemFilePathInDb = async (id: string, filePath: string): Promise<Query<any, any>> => {
  return Mediaitem.findByIdAndUpdate(id, { filePath });
};

export const findMe = async (): Promise<any[]> => {
  
  const records: any[] = [];
  const documents: any = await Mediaitem.find( { fileName: 'IMG_4730.JPG' }).exec();
  // const documents: Document<any>[] = await Mediaitem.find({ id: 'AEEKk90sNDWIDhmNSgRU2QGNa74q859wcLQz8EdE6GUB2GbMcLypHsNHm0OsqZHACFRyq-fZ9B-t24-kH2XdhnM7rvuhvNx3Kw' }).exec();
  for (const document of documents) {
    records.push(document.toObject());
  }

  // result.then( (documents: Document<any>[]) => {
  //   for (const document of documents) {
  //     debugger;
  //     console.log(document.toObject());
  //   }
  // });
  return records;

  // result[0].toObject() gives pojo
}

export const findPhotosByName = async (fileName: string): Promise<any[]> => {
  const records: any[] = [];
  const documents: any = await Mediaitem.find( { fileName: fileName }).exec();
  for (const document of documents) {
    records.push(document.toObject());
  }
  return records;
}