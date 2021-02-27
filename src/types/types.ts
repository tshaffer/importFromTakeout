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

export interface GPhotosMediaItem {
  id: string;
  baseUrl: string;
  fileName: string;
  downloaded: boolean;
  filePath: string;
  productUrl: string;
  mimeType: string;
  creationTime: string;
  width: number;
  height: number;
}

export interface DateTimeMatchResultsType {
  noDateTimeDataCount: number;
  noDateTimeMatchFound: number;
  dateTimeWithinMinFound: number;
  dateTimeWithinMaxFound: number;
  dateTimeZoneMatchFound: number;
}

export interface MatchResultsType {
  noNameMatchesFound: number;
  singleNameMatchesFound: number;
  // multipleNameMatchesFound: number;
  dateMatchFoundInMultiple: number;
  noDateMatchFoundInMultiple: number;
}

export enum MatchResultType {
  MinMatchFound = 'MinMatchFound',
  MaxMatchFound = 'MaxMatchFound',
  NoMatchFound = 'NoMatchFound',
  NoDateFound = 'NoDateFound',
  TimeZoneMatchFound = 'TimeZoneMatchFound',
}