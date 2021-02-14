import { DbMediaItem } from "../types";
import Mediaitem from '../models/Mediaitem';

export const addMediaItemToDb = async (dbMediaItem: DbMediaItem): Promise<any> => {
  return Mediaitem.collection.insertOne(dbMediaItem);
};

