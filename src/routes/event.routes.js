import Router from "express";
import { verifyJwt, verifyRole } from "../middlewares/auth.middleware.js";
import {
    createEvent,
    getEventById,
    getUserEvents,
    getAllEvents,
    bookEvent,
    updateEvent,
    cancelEvent,
    addVerifierToEvent,
    removeVerifierFromEvent
} from "../controllers/event.controller.js";

const router = Router();

router.route("/").get(getAllEvents); // fetch all events
router.route("/:eventId")
    .get(getEventById) // fetch event by id
    .post(verifyJwt, verifyRole("buyer"), bookEvent) // book event
    .patch(verifyJwt, verifyRole("seller"), updateEvent) // update event
    .delete(verifyJwt, verifyRole("seller"), cancelEvent); // cancel event
router.route("/get-user-events").get(verifyJwt, verifyRole("seller", "buyer"), getUserEvents); // works differently based on user role
router.route("/create-event").post(verifyJwt, verifyRole("seller"), createEvent); // create event
router.route("/add-verifier/:verifierId/:eventId").post(verifyJwt, verifyRole("seller"), addVerifierToEvent); // add verifier to event
router.route("/remove-verifier/:verifierId/:eventId").post(verifyJwt, verifyRole("seller"), removeVerifierFromEvent); // add verifier to event

export default router;
