import Router from "express";
import { verifyJwt, verifyRole } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get();
router.route("/:venueId").get().patch(verifyJwt, verifyRole("venueManager")).delete(verifyJwt, verifyRole("venueManager"));
router.route("/get-created-venues").get(verifyJwt, verifyRole("venueManager"));
router.route("/create-venue").post(verifyJwt, verifyRole("venueManager"));

export default router;
