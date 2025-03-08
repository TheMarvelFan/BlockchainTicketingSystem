import Router from "express";
import { verifyJwt, verifyRole } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(verifyJwt, verifyRole("seller", "buyer")); // this will function differently based on user role
// for sellers, this will return all tickets created by the seller -- we can filter the sold and unsold ones
// for buyers, this will return all tickets bought by the buyer

router.route("/:ticketId")
    .get(verifyJwt)
    .patch(verifyJwt)
    .delete(verifyJwt, verifyRole("seller", "buyer")); // get, update, delete
// ticket by id if owned (buyer or seller)

router.route("/create-ticket").post(verifyJwt, verifyRole("seller")); // create ticket for seller
router.route("/burn-ticket/:ticketId").post(verifyJwt, verifyRole("buyer")); // burn ticket for buyer
router.route("/get-burned-tickets").get(verifyJwt, verifyRole("buyer", "verifier")); // get all burned tickets for buyer and verifier

export default router;
