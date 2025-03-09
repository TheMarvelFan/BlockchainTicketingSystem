import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        userName: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        fullName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phoneNumber: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: [true, "Password is required!"]
        },
        role: {
            type: String,
            enum: ["buyer", "seller", "venueManager", "verifier"],
            required: true
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "Seller",
            validate: {
                validator: function (value) {
                    return !(this.role === "verifier" && !value);
                },
                message: "Verifier must be created and authenticated by the seller!"
            }
        },
        bookedEvents: [
            {
                type: Schema.Types.ObjectId,
                ref: "Event"
            }
        ],
        walletId: {
            type: String,
            default: null
        },
        attachedWallets: [
            [
                {
                    type: String, // wallet address
                    default: null
                },
                {
                    type: String, // encrypted private key
                    default: null
                }
            ]
        ],
        encryptedPrivateKey: {
            type: String,
            default: null
        }
    }, {
        timestamps: true,
    }
);

userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
}

export const User = mongoose.model("User", userSchema);
