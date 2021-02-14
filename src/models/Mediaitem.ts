import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const MediaitemSchema = new Schema(
  {
      id: {type: String, unique: true},
      fileName: {type: String, required: true},
  }
);

export default mongoose.model('Mediaitem', MediaitemSchema);
