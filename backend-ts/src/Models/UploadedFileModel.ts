import mongoose from "mongoose";

const FilesSchema = new mongoose.Schema({
    filename: {
      type: String,
      required: true
    },
    contentType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
});

const UploadedFilesModel = mongoose.model('UploadedFiles', FilesSchema);

export default UploadedFilesModel;