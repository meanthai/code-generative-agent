import express, {Response, Request} from 'express';
import cors from 'cors';
import 'dotenv/config';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import UserRouter from './Routes/UserRoute';

declare global {
    namespace Express {
      interface Request {
        userId: string,
        auth0Id: string,
      }
    }
  }

async function DBInitialization() {
    const client = new MongoClient(String(process.env.MONGODB_CONNECTION_STRING));
    
    try {
        const ok = await client.connect();
        console.log(ok)

        const moviesCollection = client.db("sample_mflix").collection("movies");
        
        console.log("successfully connect to the Mongo database!");

        return moviesCollection;
    } catch (e) {
        console.error(e);
    }
}
const app = express();
app.use(cors());
app.use(express.json());

app.use('/health', async(req: Request, res: Response) => {
    res.send({ message: "OK!"});
})

app.use('/api/my/user', UserRouter);

mongoose.connect(String(process.env.MONGODB_CONNECTION_STRING))
.then(() => {
    console.log("Successfully connect to the MongoDB database");
})

app.listen(4046, () => {
    console.log("Backend server started on the port 4046");
})