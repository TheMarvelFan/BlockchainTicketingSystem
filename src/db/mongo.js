import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectToDB = async () => {
    try {
        const mongoInstance = await mongoose.connect(`${ process.env.MONGODB_URI }/${ DB_NAME }`);
        console.log(`\nMongoDB Connected! DB Host: ${ mongoInstance.connection.host }`);
    } catch (error) {
        console.error(`Error connecting to DB: ${ error }`);
        process.exit(1);
    }
};

export default connectToDB;
