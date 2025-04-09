import {Request, Response} from "express";

import UserModel from "../Models/User";
import UploadedFilesModel from "../Models/UploadedFileModel";


const createUserResponse = async (req: Request, res: Response) => {
    try {
        const {_id, auth0Id, email, name, phoneNumber, files} = req.body;

        if(req.userId){
            const isExisted = await UserModel.findOne({_id: req.userId});

            if(isExisted) {
                return res.status(200).send();
            }
        }

        const newUser = new UserModel(req.body);
        
        await newUser.save();

        res.status(201).json(newUser.toObject());
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: error
        })
    }
}

const updateUserResponse = async (req: Request, res: Response) => {
    try {
        const {auth0Id, email, name, phoneNumber, hasFacialAuth, files} = req.body;

        const updatedUser = await UserModel.findOne({_id: req.userId});

        if(!updatedUser){
            console.log("User not found for updating info!!!");
            return res.status(404).json({
                message: "User not found for updating!"
            })
        } 

        if(name) updatedUser.name = name;

        if(phoneNumber) updatedUser.phoneNumber = phoneNumber;

        if(hasFacialAuth) updatedUser.hasFacialAuth = hasFacialAuth;

        if(files){
            for(const file of files){
                const existedFile = await UploadedFilesModel.findOne({filename: file.filename})

                if(existedFile) continue;

                updatedUser.files.push(file);
                const newUploadedFile = new UploadedFilesModel(file);
                await newUploadedFile.save();
            }
        } 

        await updatedUser.save();

        console.log("successfully update the user info!");

        res.status(200).json({
            message: "Successfully updated!",
            updatedUser: updatedUser.toObject(),
        })

    } catch (error) {
        res.status(500).json({
            message: error
        })
    }
}

const getUserResponse = async(req: Request, res: Response) => {
    try{
        const currentUser = await UserModel.findOne({_id: req.userId});

        if(!currentUser){
            console.log("not found user!!!");
            return res.status(404).json({
                message: "user not found"
            });
        }

        console.log("successfully get the user info");

        res.status(200).json(currentUser);

    } catch(error){
        console.log("found error: ", error);
        res.status(500).json({
            message: error
        })
    }
}

export default {
    createUser: createUserResponse as any,
    updateUser: updateUserResponse as any,
    getUser: getUserResponse as any,
}