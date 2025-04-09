import express, { RequestHandler } from "express";
import UserRoute from "../Controllers/UserController"
import { jwtCheck, jwtParse } from "../../middleware/auth";

const router = express.Router();

router.post("/", jwtCheck, UserRoute.createUser);
router.put("/", jwtCheck, jwtParse as RequestHandler, UserRoute.updateUser);
router.get("/",jwtCheck, jwtParse as RequestHandler, UserRoute.getUser);

export default router;