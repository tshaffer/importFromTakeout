import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const MediaitemSchema = new Schema(
  {
    fileName: { type: String, required: true },
    filePath: { type: String, default: '' },
    title: { type: String },
    description: { type: String },
    mimeType: { type: String },
    width: { type: Number },
    height: { type: Number },
    creationDate: { type: Date },
    dateTimeOriginal: { type: Date },
    modifyDate: { type: Date },
    gpsLatitude: { type: Number },
    gpsLongitude: { type: Number },
  }
);

export default mongoose.model('Mediaitem', MediaitemSchema);
