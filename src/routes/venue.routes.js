import Router from "express";
import { verifyJwt, verifyRole } from "../middlewares/auth.middleware.js";
import {
    getAllVenues,
    createVenue,
    getVenueById,
    getCreatedVenues,
    updateVenue,
    deleteVenue
} from "../controllers/venue.controller.js";

const router = Router();

router.route("/").get(getAllVenues);
router.route("/:venueId")
    .get(getVenueById)
    .patch(verifyJwt, verifyRole("venueManager"), updateVenue)
    .delete(verifyJwt, verifyRole("venueManager"), deleteVenue);
router.route("/get-created-venues").get(verifyJwt, verifyRole("venueManager"), getCreatedVenues);
router.route("/create-venue").post(verifyJwt, verifyRole("venueManager"), createVenue);

export default router;
