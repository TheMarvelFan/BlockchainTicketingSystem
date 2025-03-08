import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Venue } from "../models/Venue.model.js";
import { User } from "../models/User.model.js";
import { isValidObjectId } from "mongoose";

const getAllVenues = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query = "",
        sortBy = "createdAt",
        sortType = "desc"
    } = req.query;

    const options = {
        page: parseInt(`${ page }`, 10),
        limit: parseInt(`${ limit }`, 10),
        sort: {
            [sortBy]: sortType === "desc" ? -1 : 1
        }
    };

    const filter = {};

    if (query) {
        filter.title = {
            $regex: query,
            $options: "i"
        };
    }

    const venues = await Venue.aggregatePaginate(Venue.aggregate([
        {
            $match: filter
        }
    ]), options);

    venues.docs.forEach(venue => {
        delete venue.updatedAt;
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, venues, "Venues fetched successfully!")
        );
});

const getVenueById = asyncHandler(async (req, res) => {
    const { venueId } = req.params;

    if (!venueId) {
        throw new ApiError(400, "Venue ID is required!");
    }

    if (!isValidObjectId(venueId)) {
        throw new ApiError(400, "Invalid venue ID!");
    }

    const venue = await Venue.findById(venueId);

    if (!venue) {
        throw new ApiError(404, "Venue not found!");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, venue, "Venue fetched successfully!")
        );
});

const createVenue = asyncHandler(async (req, res) => {
    const {
        name,
        state,
        city,
        country,
        area,
        pinCode,
        coordinates,
        landmark,
        capacity,
        description
    } = req.body;

    const createdBy = await User.findById(req.user._id);

    if (!createdBy) {
        throw new ApiError(404, "Venue manager not found!");
    }

    if (!name || !state || !city || !country || !area || !pinCode || !capacity || !description) {
        throw new ApiError(400, "Venue name, area, city, state, country, pincode, capacity, and description are required!");
    }

    if (coordinates) {
        if (!Array.isArray(coordinates) || coordinates.length !== 2) {
            throw new ApiError(400, "Invalid coordinates!");
        }
        const latitude = coordinates[0];
        const longitude = coordinates[1];

        const northOrSouth = getLatitudeDirection(latitude);
        const eastOrWest = getLongitudeDirection(longitude);

        const absoluteLatitude = getAbsoluteLatitude(latitude);
        const absoluteLongitude = getAbsoluteLongitude(longitude);

        coordinates[0] = `${ absoluteLatitude }° ${ northOrSouth }`;
        coordinates[1] = `${ absoluteLongitude }° ${ eastOrWest }`;
    }

    const venue = new Venue({
        createdBy,
        name,
        state,
        city,
        country,
        area,
        pinCode,
        capacity,
        description
    });

    if (coordinates) {
        venue.coordinates = coordinates;
    }

    if (landmark) {
        venue.landmark = landmark;
    }

    await venue.save();

    delete venue.updatedAt;

    return res
        .status(201)
        .json(
            new ApiResponse(201, venue, "Venue created successfully!")
        );
});

const updateVenue = asyncHandler(async (req, res) => {
    const { venueId } = req.params;

    if (!venueId) {
        throw new ApiError(400, "Venue ID is required!");
    }

    if (!isValidObjectId(venueId)) {
        throw new ApiError(400, "Invalid venue ID!");
    }

    const {
        name,
        state,
        city,
        country,
        area,
        pinCode,
        coordinates,
        landmark,
        capacity,
        description
    } = req.body;

    if (!name && !state && !city && !country && !area && !pinCode && !capacity && !description && !coordinates && !landmark) {
        throw new ApiError(400, "Please provide at least one of name, state, city, country, area, pinCode, capacity, description, coordinates or landmark!");
    }

    if (coordinates) {
        if (!Array.isArray(coordinates) || coordinates.length !== 2) {
            throw new ApiError(400, "Invalid coordinates!");
        }
        const latitude = coordinates[0];
        const longitude = coordinates[1];

        const northOrSouth = getLatitudeDirection(latitude);
        const eastOrWest = getLongitudeDirection(longitude);

        const absoluteLatitude = getAbsoluteLatitude(latitude);
        const absoluteLongitude = getAbsoluteLongitude(longitude);

        coordinates[0] = `${ absoluteLatitude }° ${ northOrSouth }`;
        coordinates[1] = `${ absoluteLongitude }° ${ eastOrWest }`;
    }

    const venue = await Venue.findById(venueId);

    if (!venue) {
        throw new ApiError(404, "Venue not found!");
    }

    venue.name = name || venue.name;
    venue.state = state || venue.state;
    venue.city = city || venue.city;
    venue.country = country || venue.country;
    venue.area = area || venue.area;
    venue.pinCode = pinCode || venue.pinCode;
    venue.capacity = capacity || venue.capacity;
    venue.description = description || venue.description;

    if (coordinates) {
        venue.coordinates = coordinates;
    }

    if (landmark) {
        venue.landmark = landmark;
    }

    await venue.save();

    return res
        .status(201)
        .json(
            new ApiResponse(200, venue, "Venue updated successfully!")
        );
});

const deleteVenue = asyncHandler(async (req, res) => {
    const { venueId } = req.params;

    if (!venueId) {
        throw new ApiError(400, "Venue ID is required!");
    }

    if (!isValidObjectId(venueId)) {
        throw new ApiError(400, "Invalid venue ID!");
    }

    const venue = await Venue.findById(venueId);

    if (!venue) {
        throw new ApiError(404, "Venue not found!");
    }

    if (venue.createdBy._id?.toString() !== req.user._id?.toString()) {
        throw new ApiError(403, "You are not authorized to delete this venue!");
    }

    await venue.deleteOne();

    return res
        .status(200)
        .json(
            new ApiResponse(200, venue, "Venue deleted successfully!")
        );
});

const getCreatedVenues = asyncHandler(async (req, res) => {
    const createdBy = await User.findById(req.user._id);

    if (!createdBy) {
        throw new ApiError(404, "Venue manager not found!");
    }

    const venues = await Venue.find({
        createdBy
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, venues, "Venues fetched successfully!")
        );
});

const getLongitudeDirection = (longitude) => {
    return longitude.toString().charAt(0) === "-" ? "West" : "East"
};

const getLatitudeDirection = (latitude) => {
    return latitude.toString().charAt(0) === "-" ? "South" : "North"
};

const getAbsoluteLongitude = (longitude) => {
    return longitude.toString().replace("-", "")
};

const getAbsoluteLatitude = (latitude) => {
    return latitude.toString().replace("-", "")
};

export {
    getAllVenues,
    getVenueById,
    createVenue,
    updateVenue,
    deleteVenue,
    getCreatedVenues
};
