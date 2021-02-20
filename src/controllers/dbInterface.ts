import { DbMediaItem } from "../types";
import Mediaitem from '../models/Mediaitem';
import { Query } from "mongoose";

export const addMediaItemToDb = async (dbMediaItem: DbMediaItem): Promise<string> => {
  return Mediaitem.collection.insertOne(dbMediaItem)
    .then( (retVal: any) => {
      const dbRecordId: string = retVal.insertedId._id.toString();
      return dbRecordId;
    })
};

export const setMediaItemFilePathInDb = async (id: string, filePath: string): Promise<Query<any, any>> => {
  return Mediaitem.findByIdAndUpdate(id, { filePath });
};

