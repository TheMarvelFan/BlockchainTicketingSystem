import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Event } from "../models/Event.model.js";
import { isValidObjectId } from "mongoose";
import { Venue } from "../models/Venue.model.js";
import { User } from "../models/User.model.js";

const getAllEvents = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query = "",
        sortBy = "createdAt",
        sortType = "desc",
        expired = "false"
    } = req.query;

    const options = {
        page: parseInt(`${ page }`, 10),
        limit: parseInt(`${ limit }`, 10),
        sort: {
            [sortBy]: sortType === "desc" ? -1 : 1
        }
    };

    const expiredBool = expired === "true";

    const filter = {};

    if (query) {
        filter.title = {
            $regex: query,
            $options: "i"
        };
    }

    filter.expired = expiredBool;

    const events = await Event.aggregatePaginate(Event.aggregate([
        {
            $match: filter
        }
    ]), options);

    events.docs.forEach(event => {
        delete event.updatedAt;
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, events, "Events fetched successfully!")
        );
});

const getEventById = asyncHandler(async (req, res) => {
    const { eventId } = req.params;

    if (!eventId) {
        throw new ApiError(400, "Event ID is required!");
    }

    if (!isValidObjectId(eventId)) {
        throw new ApiError(400, "Invalid event ID!");
    }

    const event = await Event.findById(eventId);

    if (!event) {
        throw new ApiError(404, "This event does not exist!");
    }

    delete event.updatedAt;

    return res
        .status(200)
        .json(
            new ApiResponse(200, event, "Event fetched successfully!")
        );
});

const bookEvent = asyncHandler(async (req, res) => {

});

const updateEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;

    const { title, description, specialGuest, startDat, startTime, endDate, endTime, maxTickets, expired } = req.body;

    if (!title && !description && !specialGuest && !startDat && !startTime && !endDate && !endTime && !maxTickets && !expired) {
        throw new ApiError(400, "Please provide at least one  title, description, specialGuest, startDat, startTime, endDate, endTime, maxTickets or expired!");
    }

    if (!eventId) {
        throw new ApiError(400, "Event ID is required!");
    }

    if (!isValidObjectId(eventId)) {
        throw new ApiError(400, "Invalid event ID!");
    }

    const event = await Event.findById(eventId);

    if (!event) {
        throw new ApiError(404, "This event does not exist!");
    }

    const startDateAndTimeStr = `${ startDat }T${ startTime }`;
    const endDateAndTimeStr = `${ endDate }T${ endTime }`;

    let startDateAndTime = null;
    let endDateAndTime = null;

    if (startDateAndTimeStr) {
        startDateAndTime = new Date(startDateAndTimeStr);
    }

    if (endDateAndTimeStr) {
        endDateAndTime = new Date(endDateAndTimeStr);
    }

    event.title = title || event.title;
    event.description = description || event.description;
    event.specialGuest = specialGuest || event.specialGuest;
    event.startDateAndTime = startDateAndTime || event.startDateAndTime;
    event.endDateAndTime = endDateAndTime || event.endDateAndTime;
    event.maxTickets = maxTickets || event.maxTickets;
    event.expired = expired || event.expired;

    event.duration = Math.abs(event.endDateAndTime - event.startDateAndTime) / 36e5;

    await event.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, event, "Event updated successfully!")
        );
});

const cancelEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;

    if (!eventId) {
        throw new ApiError(400, "Event ID is required!");
    }

    if (!isValidObjectId(eventId)) {
        throw new ApiError(400, "Invalid event ID!");
    }

    const event = await Event.findById(eventId);

    if (!event) {
        throw new ApiError(404, "This event does not exist!");
    }

    event.expired = true;

    await event.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, event, "Event cancelled successfully!")
        );
});

const getUserEvents = asyncHandler(async (req, res) => {
    const user = req.user;
    const userRole = user?.role;

    let events = [];

    if (userRole === "buyer") {
        events = user?.bookedEvents;
    } else if (userRole === "seller") {
        events = await Event.find({
            createdBy: user
        });
    } else {
        throw new ApiError(403, "You are not authorized to view this resource!");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, events, "User events fetched successfully!")
        );
});

const createEvent = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        specialGuest,
        startDate,
        startTime,
        endDate,
        endTime,
        maxTickets,
        venueId
    } = req.body;

    if (!venueId) {
        throw new ApiError(400, "Venue ID is required!");
    }

    if (!isValidObjectId(venueId)) {
        throw new ApiError(400, "Invalid venue ID!");
    }

    const venue = await Venue.findById(venueId);

    if (!venue) {
        throw new ApiError(404, "This venue does not exist!");
    }

    if (!title || !description || !startDate || !startTime || !endDate || !endTime || !maxTickets) {
        throw new ApiError(
            400,
            "Event title, description, start and end date and time, and max number of tickets are required!"
        );
    }

    const startDateAndTimeStr = `${ startDate }T${ startTime }`;
    const endDateAndTimeStr = `${ endDate }T${ endTime }`;

    const startDateAndTime = new Date(startDateAndTimeStr);
    const endDateAndTime = new Date(endDateAndTimeStr);

    const duration = Math.abs(endDateAndTime - startDateAndTime) / 36e5;
    const expired = false;
    const createdBy = req.user;

    const event = new Event({
        title,
        description,
        startDateAndTime,
        endDateAndTime,
        maxTickets,
        venue,
        duration,
        expired,
        createdBy
    });

    if (specialGuest) {
        event.specialGuest = specialGuest;
    }

    event.verifiers = [createdBy];

    await event.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, event, "Event created successfully!")
        );
});

const addVerifierToEvent = asyncHandler(async (req, res) => {
    const { verifierId, eventId } = req.params;

    if (!eventId) {
        throw new ApiError(400, "Event ID is required!");
    }

    if (!isValidObjectId(eventId)) {
        throw new ApiError(400, "Invalid event ID!");
    }

    const event = await Event.findById(eventId);

    if (!event) {
        throw new ApiError(404, "This event does not exist!");
    }

    if (req.user?._id?.toString() !== event.createdBy?._id?.toString()) {
        throw new ApiError(403, "You are not authorized to add or remove a verifier to or from this event!");
    }

    if (!verifierId) {
        throw new ApiError(400, "Verifier ID is required!");
    }

    if (!isValidObjectId(verifierId)) {
        throw new ApiError(400, "Invalid verifier ID!");
    }

    const verifier = await User.findById(verifierId);

    if (!verifier) {
        throw new ApiError(404, "This verifier does not exist!");
    }

    if (event.verifiers.includes(verifier)) {
        throw new ApiError(400, "This verifier is already added to this event!");
    }

    event.verifiers.push(verifier);

    await event.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, event, "Verifier added to event successfully!")
        );
});

const removeVerifierFromEvent = asyncHandler(async (req, res) => {
    const { verifierId, eventId } = req.params;

    if (!eventId) {
        throw new ApiError(400, "Event ID is required!");
    }

    if (!isValidObjectId(eventId)) {
        throw new ApiError(400, "Invalid event ID!");
    }

    const event = await Event.findById(eventId);

    if (!event) {
        throw new ApiError(404, "This event does not exist!");
    }

    if (req.user?._id?.toString() !== event.createdBy?._id?.toString()) {
        throw new ApiError(403, "You are not authorized to add or remove a verifier to or from this event!");
    }

    if (!verifierId) {
        throw new ApiError(400, "Verifier ID is required!");
    }

    if (!isValidObjectId(verifierId)) {
        throw new ApiError(400, "Invalid verifier ID!");
    }

    const verifier = await User.findById(verifierId);

    if (!verifier) {
        throw new ApiError(404, "This verifier does not exist!");
    }

    if (!event.verifiers.includes(verifier)) {
        throw new ApiError(400, "This verifier is not added to this event!");
    }

    event.verifiers = event.verifiers.filter(v => v._id.toString() !== verifierId);

    await event.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, event, "Verifier removed from event successfully!")
        );
});

export {
    getAllEvents,
    getEventById,
    bookEvent,
    updateEvent,
    cancelEvent,
    getUserEvents,
    createEvent,
    addVerifierToEvent,
    removeVerifierFromEvent
};
