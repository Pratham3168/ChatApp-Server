import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected Successfully", mongoose.connection.host);
    }
    catch(err){
        console.log("Error in connecting to MongoDB",err);
        process.exit(1);
    }
    
}