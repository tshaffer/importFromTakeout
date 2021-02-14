export interface DbMediaItem {
  fileName: string;
  filePath?:string;
  title?:string;
  description?:string;
  mimeType?:string;
  width?:number;
  height?:number;
  creationDate?:Date;
  dateTimeOriginal?:Date;
  modifyDate?:string;
  gpsLatitude?:number;
  gpsLongitude?:number;
}
