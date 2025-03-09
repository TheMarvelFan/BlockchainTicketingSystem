import { Ticket } from "../models/Ticket.model.js";
import { getTicketContract, getWeb3 } from "../utils/Blockchain.js";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.model.js";
import { isValidObjectId } from "mongoose";

// OTP storage (should use a proper database in production)
const otpStore = {};

// Create a new ticket (mint)
const createTicket = asyncHandler(async (req, res) => {
    try {
        const { price, eventId, venueId, tokenURI } = req.body;
        const userId = req.user._id;
        const createdBy = await User.findById(userId);

        const walletId = req.user.walletId;

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
            createdBy,
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
        const user = await User.findById(userId);

        let {
            query = "",
            pageNumber = 1,
            pageLimit = 10,
            sortBy = "createdAt",
            sortType = "desc",
        } = req.query;

        let filter = {};

        if (query) {
            filter.title = {
                $regex: query,
                $options: "i"
            };
        }

        if (user.role === "seller") {
            filter.createdBy = userId;
        } else if (user.role === "buyer") {
            filter.boughtBy = userId;
        }

        const aggregateQuery = Ticket.aggregate([
            {
                $match: filter
            },
            {
                $lookup: {
                    from: "events",
                    localField: "eventId",
                    foreignField: "_id",
                    as: "eventId"
                }
            },
            {
                $unwind: {
                    path: "$eventId",
                    preserveNullAndEmptyArrays: true
                }
            }, // Unwind to get object instead of array
            {
                $lookup: {
                    from: "venues", // Replace with the actual collection name for venues
                    localField: "venueId",
                    foreignField: "_id",
                    as: "venueId"
                }
            },
            {
                $unwind: {
                    path: "$venueId",
                    preserveNullAndEmptyArrays: true
                }
            }, // Unwind to get object instead of array
            {
                $sort: {
                    createdAt: -1
                }
            }
        ]);

        const options = {
            page: pageNumber,
            limit: pageLimit,
            sort: {
                [sortBy]: sortType === "desc" ? -1 : 1
            }
        };

        const tickets = await Ticket.aggregatePaginate(aggregateQuery, options);

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
const getTicketById = asyncHandler(async (req, res) => {
    try {
        const { ticketId } = req.params;

        if (!ticketId) {
            throw new ApiError(400, "Ticket ID is required");
        }

        if (!isValidObjectId(ticketId)) {
            throw new ApiError(400, "Invalid ticket ID");
        }

        const userId = req.user._id;
        const user = await User.findById(userId);

        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            throw new ApiError(404, "Ticket not found");
        }

        // Check if user is authorized to view this ticket
        if (ticket.boughtBy !== user && ticket.createdBy !== user) {
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
        const { ticketId } = req.params;

        if (!ticketId) {
            throw new ApiError(400, "Ticket ID is required");
        }

        if (!isValidObjectId(ticketId)) {
            throw new ApiError(400, "Invalid ticket ID");
        }

        const userId = req.user._id;

        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            throw new ApiError(404, "Ticket not found");
        }

        // Check if user is the creator and ticket is not sold yet
        if (ticket.createdBy._id.toString() !== userId.toString() && !ticket.sold) {
            throw new ApiError(403, "Not authorized to update this ticket");
        }

        // Only allow updating certain fields
        const updatableFields = ["metadata", "price"];
        const updates = {};

        updatableFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        updates.updatedAt = Date.now();

        const updatedTicket = await Ticket.findByIdAndUpdate(
            ticketId,
            {
                $set: updates
            },
            {
                new: true,
                runValidators: true
            }
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

        if (!ticketId) {
            throw new ApiError(400, "Ticket ID is required");
        }

        if (!isValidObjectId(ticketId)) {
            throw new ApiError(400, "Invalid ticket ID");
        }

        const userId = req.user._id;

        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            throw new ApiError(404, "Ticket not found");
        }

        // Check if user is the creator and ticket is not sold yet
        if (ticket.createdBy._id.toString() !== userId.toString() || ticket.sold) {
            throw new ApiError(403, "Not authorized to delete this ticket");
        }

        // also make sure that the ticket is removed from the chain

        ticket.deleteOne();

        return res
            .status(200)
            .json(
                new ApiResponse(200, ticket, "Ticket deleted successfully")
            );
    } catch (error) {
        console.error("Error deleting ticket:", error);
        throw new ApiError(500, "Error deleting ticket", error.message);
    }
});

// Generate OTP and prepare for burn verification
const prepareBurnTicket = asyncHandler(async (req, res) => {
    try {
        // this route can be accessed only by buyer, but it must be initiated by the
        // verifier or the seller
        // note for improvement: add this layer of security
        const { ticketId } = req.params;

        if (!ticketId) {
            throw new ApiError(400, "Ticket ID is required");
        }

        if (!isValidObjectId(ticketId)) {
            throw new ApiError(400, "Invalid ticket ID");
        }

        const userId = req.user._id;

        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            throw new ApiError(404, "Ticket not found");
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
        // this route can be accessed only by buyer, but it must be initiated by the
        // verifier or the seller
        // note for improvement: add this layer of security
        const { ticketId } = req.params;

        if (!ticketId) {
            throw new ApiError(400, "Ticket ID is required");
        }

        if (!isValidObjectId(ticketId)) {
            throw new ApiError(400, "Invalid ticket ID");
        }

        const { otp } = req.body;
        const userId = req.user._id;
        const walletId = req.user.walletId;

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
        let query = {
            used: true
        };

        if (req.user.role === "verifier" || req.user.role === "seller") {
            // Verifiers can see all burned tickets
            // for this we need another label in the ticket model
            // "burnedBy"
            // which will be updated at some point in the above burnTicket method
            // using that label we can query that here
        } else {
            // Regular users can only see their own burned tickets
            query.boughtBy = userId;
        }

        const tickets = await Ticket.find(query);

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
    getTicketById,
    updateTicket,
    deleteTicket,
    prepareBurnTicket,
    burnTicket,
    getBurnedTickets
};
