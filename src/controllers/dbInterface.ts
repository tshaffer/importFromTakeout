import { DbMediaItem } from "../types";
import Mediaitem from '../models/Mediaitem';

export const addMediaItemToDb = async (dbMediaItem: DbMediaItem): Promise<any> => {

  const foo = new Mediaitem({ fileName: 'foo' });

  return new Promise((resolve, reject) => {
    foo.save(function (err) {
      console.log(foo._id);
      // legit string is in foo._id.toString()
      return resolve(foo);
    });
  })

  // return Mediaitem.collection.insertOne(dbMediaItem);
  // return Mediaitem.sa
};

