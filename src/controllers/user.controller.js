import { User } from "../models/User.model.js";
import {
    EMAIL_REGEX,
    SELLER_WALLET_ARRAY_INDEX,
    BUYER_WALLET_ARRAY_INDEX,
    WALLET_ADDRESS_INDEX,
    ENCRYPTED_PRIVATE_KEY_INDEX
} from "../constants.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { createWalletAddress } from "../utils/createNewWalletAddress.js";

const generateAccessToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = await user.generateAccessToken();

        await user.save(
            {
                validateBeforeSave: false
            }
        );

        return accessToken;
    } catch (error) {
        throw new ApiError(500, "Failed to generate token!");
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from request from frontend
    const { fullName, email, username, password } = req.body;
    let { role = "buyer" } = req.body; // if no role is provided, default to buyer

    // validate user details
    if (
        [ fullName, email, username, password ].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "Please fill in all fields!");
    }

    if (!EMAIL_REGEX.test(email)) {
        throw new ApiError(400, "Please provide a valid email address!");
    }

    // check if user already exists using both username and email
    const duplicateUser = await User.findOne({
        $or: [
            {
                username
            },
            {
                email
            }
        ]
    });

    if (duplicateUser) {
        if (duplicateUser.role === role) {
            throw new ApiError(409, "User with this email or username already exists");
        } else if (role === "verifier" || role === "venueManager") {
            throw new ApiError(409, "You need to use a different email or username to create this account");
        } else {
            if (role === "buyer") {
                if (duplicateUser.role === "seller") {
                    const [ buyerWalletAddress, encryptedPrivateKey ] = await createWalletAddress();
                    duplicateUser.attachedWallets[BUYER_WALLET_ARRAY_INDEX][WALLET_ADDRESS_INDEX] = buyerWalletAddress;
                    duplicateUser.attachedWallets[BUYER_WALLET_ARRAY_INDEX][ENCRYPTED_PRIVATE_KEY_INDEX] = encryptedPrivateKey;
                    duplicateUser.walletId = buyerWalletAddress;
                    duplicateUser.encryptedPrivateKey = encryptedPrivateKey;
                    duplicateUser.role = role;
                } else {
                    throw new ApiError(409, "You need to use a different email and username to create this account");
                }
            } else {
                if (duplicateUser.role === "buyer") {
                    const [ sellerWalletAddress, encryptedPrivateKey ] = await createWalletAddress();
                    duplicateUser.attachedWallets[SELLER_WALLET_ARRAY_INDEX][WALLET_ADDRESS_INDEX] = sellerWalletAddress;
                    duplicateUser.attachedWallets[SELLER_WALLET_ARRAY_INDEX][ENCRYPTED_PRIVATE_KEY_INDEX] = encryptedPrivateKey;
                    duplicateUser.walletId = sellerWalletAddress;
                    duplicateUser.encryptedPrivateKey = encryptedPrivateKey;
                    duplicateUser.role = role;
                } else {
                    throw new ApiError(409, "You need to use a different email and username to create this account");
                }
            }

            return res
                .status(201)
                .json(
                    new ApiResponse(
                        200,
                        duplicateUser,
                        "User registered successfully!"
                    )
                );
        }
    }

    let walletAddress = null;
    let encryptedPrivateKey = null;
    let attachedWallets = [
        [
            null,
            null
        ],
        [
            null,
            null
        ]
    ];

    if (["buyer", "seller"].includes(role)) {
        [ walletAddress, encryptedPrivateKey] = await createWalletAddress();
    } else {
        throw new ApiError(400, "Please select user type!");
    }

    // create user object and save it to db
    const user = await User.create({
        fullName,
        email,
        password,
        username: username.toLowerCase(),
        attachedWallets
    });

    if (role === "buyer") {
        user.attachedWallets[BUYER_WALLET_ARRAY_INDEX][WALLET_ADDRESS_INDEX] = walletAddress;
        user.attachedWallets[BUYER_WALLET_ARRAY_INDEX][ENCRYPTED_PRIVATE_KEY_INDEX] = encryptedPrivateKey;
        user.encryptedPrivateKey = encryptedPrivateKey;
        user.walletId = walletAddress;
    } else if (role === "seller") {
        user.attachedWallets[SELLER_WALLET_ARRAY_INDEX][WALLET_ADDRESS_INDEX] = walletAddress;
        user.attachedWallets[SELLER_WALLET_ARRAY_INDEX][ENCRYPTED_PRIVATE_KEY_INDEX] = encryptedPrivateKey;
        user.encryptedPrivateKey = encryptedPrivateKey;
        user.walletId = walletAddress;
    } else {
        user.attachedWallets = [
            [
                null,
                null
            ],
            [
                null,
                null
            ]
        ];
        user.walletId = null;
        user.encryptedPrivateKey = null;
    }

    user.role = role;

    await user.save();

    const userCreated = await User.findById(user._id).select(
        "-password"
    );

    // check if user was saved successfully by verifying received response
    if (!userCreated) {
        throw new ApiError(500, "Failed to save user to database!");
    }

    // send response to frontend
    return res.status(201).json(
        new ApiResponse(
            200,
            userCreated,
            "User registered successfully!"
        )
    );
});

const loginUser = asyncHandler(async (req, res) => {
    // get user data from request
    const {
        email,
        username,
        password,
    } = req.body;

    let { role } = req.body;

    // username or email
    if (!email && !username) {
        throw new ApiError(400, "Please provide either your email or username!");
    }

    // find user in db
    const foundUser = await User.findOne({
        $or: [
            {
                username
            },
            {
                email
            }
        ]
    });

    if (!foundUser) {
        throw new ApiError(404, "User not found!");
    }

    // compare password
    const isValid = await foundUser.isPasswordCorrect(password);
    if (!isValid) {
        throw new ApiError(401, "Password incorrect!");
    }

    // generate access token
    const accessToken = await generateAccessToken(
        foundUser._id
    );

    // send response cookie with tokens
    const loggedInUser = await User.findById(foundUser._id).select("-password");

    const options = {
        httpOnly: true,
        secure: true
    }

    if (role && loggedInUser.role !== role) {
        throw new ApiError(400, `Your account is not of type ${role}!`);
    }

    if (role === "buyer") {
        loggedInUser.walletId = loggedInUser.attachedWallets[BUYER_WALLET_ARRAY_INDEX][WALLET_ADDRESS_INDEX];
        loggedInUser.encryptedPrivateKey = loggedInUser.attachedWallets[BUYER_WALLET_ARRAY_INDEX][ENCRYPTED_PRIVATE_KEY_INDEX];
    } else if (role === "seller") {
        loggedInUser.walletId = loggedInUser.attachedWallets[SELLER_WALLET_ARRAY_INDEX][WALLET_ADDRESS_INDEX];
        loggedInUser.encryptedPrivateKey = loggedInUser.attachedWallets[SELLER_WALLET_ARRAY_INDEX][ENCRYPTED_PRIVATE_KEY_INDEX];
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken
                },
                "User logged in successfully!"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged out successfully!"
            )
        );
});

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password!");
    }

    user.password = newPassword;
    await user.save({
        validateBeforeSave: false
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password changed successfully!"
            )
        )
});

const getCurrentUser = asyncHandler( async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully!"
        ));
});

const updateAccountDetails = asyncHandler( async (req, res) => {
    const { fullName, email, userName, address, phoneNumber } = req.body;

    if (!fullName && !email && !userName && !address && !phoneNumber) {
        throw new ApiError(400, "Please provide at least one of full name, email, username, address or phone number!");
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
        throw new ApiError(409, "User with this email or username already exists!");
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email,
                userName,
                address,
                phoneNumber
            }
        },
        {
            new: true
        }
    ).select("-password");

    res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "User account details updated successfully!"
            )
        )
});

const switchUserRole = asyncHandler( async (req, res) => {
    const { role } = req.body;

    if (!["buyer", "seller"].includes(req.user?.role)) {
        throw new ApiError(400, "Only buyers and sellers are allowed to switch roles!");
    }

    if (!role) {
        throw new ApiError(400, "Please provide a role!");
    }

    if (role === "verifier" && role === "venueManager") {
        throw new ApiError(400, "You can only switch between buyer and seller!");
    }

    // buyers and sellers cannot switch to venueManager or verifier
    // venueManagers and verifiers cannot switch to buyer or seller
    // the only switching allowed is between buyer and seller
    // when switching roles, the wallet ID is updated
    // buyer wallet is different from seller wallet for the same user

    let user;

    if (role === "seller") {
        if (req.user?.role === "buyer") {
            user = await setRole(req.user, role);
            const sellerWallet = user.attachedWallets[SELLER_WALLET_ARRAY_INDEX][WALLET_ADDRESS_INDEX];
            const encryptedPrivateKey = user.attachedWallets[SELLER_WALLET_ARRAY_INDEX][ENCRYPTED_PRIVATE_KEY_INDEX];

            user.walletId = sellerWallet;
            user.encryptedPrivateKey = encryptedPrivateKey;

            if (!sellerWallet) {
                throw new ApiError(400, "Please create a seller account first!");
            }
        } else {
            throw new ApiError(400, "You are already a seller!");
        }
    } else if (role === "buyer") {
        if (req.user?.role === "seller") {
            user = await setRole(req.user, role);
            const buyerWallet = user.attachedWallets[BUYER_WALLET_ARRAY_INDEX][WALLET_ADDRESS_INDEX];
            const encryptedPrivateKey = user.attachedWallets[BUYER_WALLET_ARRAY_INDEX][ENCRYPTED_PRIVATE_KEY_INDEX];

            user.walletId = buyerWallet;
            user.encryptedPrivateKey = encryptedPrivateKey;

            if (!buyerWallet) {
                throw new ApiError(400, "Please create a buyer account first!");
            }
        } else {
            throw new ApiError(400, "You are already a buyer!");
        }
    }

    req.user = user;

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Role switched successfully!")
        );
});

const setRole = async (user, role) => {
    return User.findByIdAndUpdate(
        user._id,
        {
            $set: {
                role
            }
        },
        {
            new: true
        }
    );
}

export {
    registerUser,
    loginUser,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    switchUserRole
};
