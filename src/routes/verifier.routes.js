import { Router } from "express";
import { verifyJwt, verifyRole } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(verifyJwt, verifyRole("seller")); // get all created verifiers
router.route("/:verifierId")
    .get(verifyJwt, verifyRole("seller"))
    .patch(verifyJwt, verifyRole("seller")) // get, update created verifier by id
    .delete(verifyJwt, verifyRole("seller")); // delete created verifier by id
router.route("/create-verifier").post(verifyJwt, verifyRole("seller")); // create verifier

export default router;
