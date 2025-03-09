import { Ticket } from "../models/Ticket.model.js";
import { getTicketContract, getWeb3 } from "../utils/Blockchain.js";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// OTP storage (should use a proper database in production)
const otpStore = {};

// Helper to check if user is the owner or creator of a ticket
const isAuthorized = async (userId, ticketId) => {
    const ticket = await Ticket.findById(ticketId);
    return ticket && (ticket.createdBy.toString() === userId.toString() ||
        (ticket.boughtBy && ticket.boughtBy.toString() === userId.toString()));
};

// Create a new ticket (mint)
const createTicket = asyncHandler(async (req, res) => {
    try {
        const { price, eventId, venueId, tokenURI } = req.body;
        const userId = req.user.id;
        const walletId = req.user.walletAddress;

        // Mint NFT on blockchain
        const ticketContract = getTicketContract();
        const web3 = getWeb3();

        const gasEstimate = await ticketContract.methods.mintTicket(
            tokenURI,
            web3.utils.toWei(price.toString(), "ether"),
            eventId,
            venueId
        ).estimateGas({ from: walletId });

        const receipt = await ticketContract.methods.mintTicket(
            tokenURI,
            web3.utils.toWei(price.toString(), "ether"),
            eventId,
            venueId
        ).send({
            from: walletId,
            gas: Math.floor(gasEstimate * 1.1) // Add 10% buffer
        });

        const nftId = receipt.events.TicketMinted.returnValues.tokenId;

        // Create ticket in database
        const ticket = new Ticket({
            nftId,
            walletId,
            sold: false,
            used: false,
            eventId,
            venueId,
            createdBy: userId,
            price,
            metadata: {
                tokenURI,
                txHash: receipt.transactionHash
            }
        });

        await ticket.save();

        return res
            .status(201)
            .json(
                new ApiResponse(201, ticket, "Ticket created successfully!")
            );
    } catch (error) {
        console.error("Error creating ticket:", error);
        throw new ApiError(500, "Error creating ticket", error.message);
    }
});

// Get all tickets
const getTickets = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        let query = {};

        if (req.query.role === "seller") {
            query.createdBy = userId;
        } else if (req.query.role === "buyer") {
            query.boughtBy = userId;
        } else {
            // If no role specified, show tickets they created or bought
            query.$or = [{ createdBy: userId }, { boughtBy: userId }];
        }

        const tickets = await Ticket.find(query)
            .populate("eventId")
            .populate("venueId")
            .sort({ createdAt: -1 });

        return res
            .status(200)
            .json(
                new ApiResponse(200, tickets, "Tickets fetched successfully!")
            );
    } catch (error) {
        console.error("Error fetching tickets:", error);
        throw new ApiError(500, "Error fetching tickets", error.message);
    }
});

// Get single ticket
const getTicket = asyncHandler(async (req, res) => {
    try {
        const { ticketId } = req.params;
        const userId = req.user._id;

        const ticket = await Ticket.findById(ticketId)
            .populate("eventId")
            .populate("venueId");

        if (!ticket) {
            throw new ApiError(404, "Ticket not found");
        }

        // Check if user is authorized to view this ticket
        if (!await isAuthorized(userId, ticketId)) {
            throw new ApiError(403, "Not authorized to view this ticket");
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, ticket, "Ticket fetched successfully")
            );
    } catch (error) {
        console.error("Error fetching ticket:", error);
        throw new ApiError(500, "Error fetching ticket", error.message);
    }
});

// Update ticket details (only if owned)
const updateTicket = asyncHandler(async (req, res) => {
    try {
        const ticketId = req.params.ticketId;
        const userId = req.user.id;

        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            throw new ApiError(404, "Ticket not found");
        }

        // Check if user is the creator and ticket is not sold yet
        if (ticket.createdBy.toString() !== userId.toString() || ticket.sold) {
            throw new ApiError(403, "Not authorized to update this ticket");
        }

        // Only allow updating certain fields
        const updatableFields = ["metadata"];
        const updates = {};

        updatableFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        updates.updatedAt = Date.now();

        const updatedTicket = await Ticket.findByIdAndUpdate(
            ticketId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        return res
            .status(200)
            .json(
                new ApiResponse(200, updatedTicket, "Ticket updated successfully")
            );
    } catch (error) {
        console.error("Error updating ticket:", error);
        throw new ApiError(500, "Error updating ticket", error.message);
    }
});

// Delete ticket (only if owned and not sold)
const deleteTicket = asyncHandler(async (req, res) => {
    try {
        const ticketId = req.params.ticketId;
        const userId = req.user.id;

        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            throw new ApiError(404, "Ticket not found");
        }

        // Check if user is the creator and ticket is not sold yet
        if (ticket.createdBy.toString() !== userId.toString() || ticket.sold) {
            throw new ApiError(403, "Not authorized to delete this ticket");
        }

        await Ticket.findByIdAndDelete(ticketId);

        return res
            .status(200)
            .json(
                new ApiResponse(200, null, "Ticket deleted successfully")
            );
    } catch (error) {
        console.error("Error deleting ticket:", error);
        throw new ApiError(500, "Error deleting ticket", error.message);
    }
});

// Generate OTP and prepare for burn verification
const prepareBurnTicket = asyncHandler(async (req, res) => {
    try {
        const { ticketId } = req.params;
        const userId = req.user.id;

        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            throw new ApiError(404, "Ticket not found");
        }

        // Verify user is authorized verifier
        if (!req.user.isVerifier) {
            throw new ApiError(403, "Not authorized to prepare burn verification");
        }

        // Generate OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

        // Store OTP
        otpStore[ticketId] = {
            otp,
            timestamp: Date.now()
        };

        // Set OTP hash on blockchain
        const ticketContract = getTicketContract();
        const web3 = getWeb3();

        await ticketContract.methods.setOTPHash(ticket.nftId, otpHash)
            .send({
                from: req.user.walletAddress,
                gas: 200000
            });

        return res
            .status(200)
            .json(
                new ApiResponse(200, { ticketId, otp }, "Burn verification prepared successfully")
            );
    } catch (error) {
        console.error("Error preparing burn verification:", error);
        throw new ApiError(500, "Error preparing burn verification", error.message);
    }
});

// Burn ticket
const burnTicket = asyncHandler(async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { otp } = req.body;
        const userId = req.user.id;
        const walletId = req.user.walletAddress;

        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            throw new ApiError(404, "Ticket not found");
        }

        // Check if user owns the ticket
        if (ticket.boughtBy.toString() !== userId.toString()) {
            throw new ApiError(403, "Not authorized to burn this ticket");
        }

        if (ticket.used) {
            throw new ApiError(400, "Ticket already burned");
        }

        // Burn on blockchain
        const ticketContract = getTicketContract();

        await ticketContract.methods.burnTicket(ticket.nftId, otp)
            .send({
                from: walletId,
                gas: 200000
            });

        // Update database
        ticket.used = true;
        ticket.updatedAt = Date.now();
        await ticket.save();

        return res
            .status(200)
            .json(
                new ApiResponse(200, ticket, "Ticket burned successfully")
            );
    } catch (error) {
        console.error("Error burning ticket:", error);
        throw new ApiError(500, "Error burning ticket", error.message);
    }
});

// Get burned tickets
const getBurnedTickets = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        let query = { used: true };

        if (req.user.isVerifier) {
            // Verifiers can see all burned tickets
        } else {
            // Regular users can only see their own burned tickets
            query.boughtBy = userId;
        }

        const tickets = await Ticket.find(query)
            .populate("eventId")
            .populate("venueId")
            .sort({ updatedAt: -1 });

        return res
            .status(200)
            .json(
                new ApiResponse(200, tickets, "Burned tickets fetched successfully!")
            );
    } catch (error) {
        console.error("Error fetching burned tickets:", error);
        throw new ApiError(500, "Error fetching burned tickets", error.message);
    }
});

export {
    createTicket,
    getTickets,
    getTicket,
    updateTicket,
    deleteTicket,
    prepareBurnTicket,
    burnTicket,
    getBurnedTickets
};
