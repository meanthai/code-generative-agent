import mongoose from "mongoose";
// File reference schema that points to GridFS files
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

const userSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        default: () => new mongoose.Types.ObjectId(),
    },
    auth0Id: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        // required: true,
    },
    phoneNumber: {
        type: String,
        // required: true,
    },
    hasFacialAuth: {
        type: Boolean,
        default: false
    },
    files: [FilesSchema] // Array of file references

});



const UserModel = mongoose.model('User', userSchema);

export default UserModel;
