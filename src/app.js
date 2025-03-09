import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({
    limit: "32kb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "32kb"
}));

app.use(express.static("public"));

app.use(cookieParser());

import userRoutes from "./routes/user.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import venueRoutes from "./routes/venue.routes.js";
import eventRoutes from "./routes/event.routes.js";
import verifierRoutes from "./routes/verifier.routes.js";
import healthcheckRoutes from "./routes/healthcheck.routes.js";

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/tickets", ticketRoutes);
app.use("/api/v1/venues", venueRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/verifiers", verifierRoutes);
app.use("/api/v1/healthcheck", healthcheckRoutes);

export { app };
