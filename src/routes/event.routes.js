import Router from "express";
import { verifyJwt, verifyRole } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(); // fetch all events
router.route("/:eventId")
    .get() // fetch event by id
    .post(verifyJwt, verifyRole("buyer")) // book event
    .patch(verifyJwt, verifyRole("seller")) // update event
    .delete(verifyJwt, verifyRole("seller")); // cancel event
router.route("/get-user-events").get(verifyJwt, verifyRole("seller", "buyer")); // works differently based on user role
router.route("/create-event").post(verifyJwt, verifyRole("seller"));
router.route("/add-verifier/:verifierId/:eventId").post(verifyJwt, verifyRole("seller")); // add verifier to event
router.route("/remove-verifier/:verifierId/:eventId").post(verifyJwt, verifyRole("seller")); // add verifier to event

export default router;
