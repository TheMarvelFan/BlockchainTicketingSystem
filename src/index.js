import dotenv from "dotenv";
import { app } from "./app.js";
import connectToDB from "./db/mongo.js";

dotenv.config({
    path: "./.env"
});

connectToDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running on port: ${process.env.PORT || 8000}`);
        });
    })
    .catch((err) => {
        console.error(`MongoDB Connection failed: ${err}`);
        throw err;
    });

