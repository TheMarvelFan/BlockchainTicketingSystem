import { Router } from "express";
import { verifyJwt, verifyRole } from "../middlewares/auth.middleware.js";
import {
    createVerifier,
    getVerifierById,
    updateVerifier,
    deleteVerifier,
    getCreatedVerifiers
} from "../controllers/verifier.controller.js";

const router = Router();

router.route("/").get(verifyJwt, verifyRole("seller"), getCreatedVerifiers); // get all created verifiers
router.route("/:verifierId")
    .get(verifyJwt, verifyRole("seller"), getVerifierById)
    .patch(verifyJwt, verifyRole("seller"), updateVerifier) // get, update created verifier by id
    .delete(verifyJwt, verifyRole("seller"), deleteVerifier); // delete created verifier by id
router.route("/create-verifier").post(verifyJwt, verifyRole("seller"), createVerifier); // create verifier

export default router;
