import Router from "express";
import { verifyJwt, verifyRole } from "../middlewares/auth.middleware.js";
import {
    createTicket,
    getTickets,
    getTicketById,
    updateTicket,
    deleteTicket,
    burnTicket,
    getBurnedTickets,
    prepareBurnTicket
} from "../controllers/ticket.controller.js";

const router = Router();

router.route("/").get(verifyJwt, verifyRole("seller", "buyer"), getTickets); // this will function differently based on user role
// for sellers, this will return all tickets created by the seller -- we can filter the sold and unsold ones
// for buyers, this will return all tickets bought by the buyer

router.route("/:ticketId")
    .get(verifyJwt, verifyRole("seller", "buyer"), getTicketById)
    .patch(verifyJwt, verifyRole("seller"), updateTicket)
    .delete(verifyJwt, verifyRole("seller"), deleteTicket); // get, update, delete
// ticket by id if owned (buyer or seller)

router.route("/create-ticket")
    .post(verifyJwt, verifyRole("seller"), createTicket); // create ticket for seller
router.route("/prepare-burn-ticket/:ticketId")
    .get(verifyJwt, verifyRole("buyer"), prepareBurnTicket); // send OTP request for burning ticket
router.route("/burn-ticket/:ticketId")
    .post(verifyJwt, verifyRole("buyer"), burnTicket); // burn ticket for buyer
router.route("/get-burned-tickets")
    .get(verifyJwt, verifyRole("buyer", "verifier", "seller"), getBurnedTickets); // get all burned tickets for buyer, verifier and seller

export default router;
