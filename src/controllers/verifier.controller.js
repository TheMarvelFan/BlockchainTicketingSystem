import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/User.model.js";
import { isValidObjectId } from "mongoose";
import userRoutes from "../routes/user.routes.js";

const getCreatedVerifiers = asyncHandler(async (req, res) => {
    const createdBy = await User.findById(req.user?._id);

    if (!createdBy) {
        throw new ApiError(404, "User not found!");
    }

    const verifiers = await User.find({
        createdBy
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, verifiers, "Verifiers fetched successfully!")
        );
});

const getVerifierById = asyncHandler(async (req, res) => {
    const { verifierId } = req.params;

    if (!verifierId) {
        throw new ApiError(400, "Verifier ID is required!");
    }

    if (!isValidObjectId(verifierId)) {
        throw new ApiError(400, "Invalid verifier ID!");
    }

    const verifier = await User.findById(verifierId);

    if (!verifier) {
        throw new ApiError(404, "Verifier not found!");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, verifier, "Verifier fetched successfully!")
        );
});

const createVerifier = asyncHandler(async (req, res) => {
    const createdBy = await User.findById(req.user?._id);

    if (!createdBy) {
        throw new ApiError(404, "User not found!");
    }

    const { userName, fullName, phoneNumber, address, email } = req.body;
    let { password } = req.body;

    if (!userName || !fullName || !phoneNumber || !address || !email) {
        throw new ApiError(400, "Verifier username, full name, phone number, address and email are required!");
    }

    const duplicateUser = await User.findOne({
        $or: [
            {
                userName
            },
            {
                email
            }
        ]
    });

    if (duplicateUser) {
        throw new ApiError(400, "Verifier with this username or email already exists!");
    }

    if (!password) {
        password = "Password@123";
    }

    const role = "verifier";

    const verifier = await User.create({
        createdBy,
        userName,
        fullName,
        phoneNumber,
        address,
        email,
        password,
        role
    });

    return res
        .status(201)
        .json(
            new ApiResponse(201, verifier, "Verifier created successfully!")
        );
});

const updateVerifier = asyncHandler(async (req, res) => {
    const { verifierId } = req.params;

    if (!verifierId) {
        throw new ApiError(400, "Verifier ID is required!");
    }

    if (!isValidObjectId(verifierId)) {
        throw new ApiError(400, "Invalid verifier ID!");
    }

    const { userName, fullName, phoneNumber, address, email } = req.body;

    if (!userName && !fullName && !phoneNumber && !address && !email) {
        throw new ApiError(400, "At least one of username, full name, phone number, address and email is required!");
    }

    const duplicateUser = await User.findOne({
        $or: [
            {
                userName
            },
            {
                email
            }
        ]
    });

    if (duplicateUser) {
        throw new ApiError(400, "Verifier with this username or email already exists!");
    }

    const verifier = await User.findById(verifierId);

    if (!verifier) {
        throw new ApiError(404, "Verifier not found!");
    }

    verifier.userName = userName || verifier.userName;
    verifier.fullName = fullName || verifier.fullName;
    verifier.phoneNumber = phoneNumber || verifier.phoneNumber;
    verifier.address = address || verifier.address;
    verifier.email = email || verifier.email;

    await verifier.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, verifier, "Verifier updated successfully!")
        );
});

const deleteVerifier = asyncHandler(async (req, res) => {
    const { verifierId } = req.params;

    if (!verifierId) {
        throw new ApiError(400, "Verifier ID is required!");
    }

    if (!isValidObjectId(verifierId)) {
        throw new ApiError(400, "Invalid verifier ID!");
    }

    const verifier = await User.findById(verifierId);

    if (!verifier) {
        throw new ApiError(404, "Verifier not found!");
    }

    if (req.user._id.toString() !== verifier.createdBy._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this verifier!");
    }

    await verifier.deleteOne();

    return res
        .status(200)
        .json(
            new ApiResponse(200, verifier, "Verifier deleted successfully!")
        );
});

export {
  getCreatedVerifiers,
  getVerifierById,
  createVerifier,
  updateVerifier,
  deleteVerifier
};
