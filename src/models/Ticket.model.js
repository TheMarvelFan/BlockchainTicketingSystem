import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const ticketSchema = new Schema(
    {
        nftId: {
            type: String,
            required: true,
            unique: true
        },
        walletId: {
            type: String,
            required: true
        },
        sold: {
            type: Boolean,
            default: false
        },
        used: {
            type: Boolean,
            default: false
        },
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },
        venueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Venue",
            required: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        boughtBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        price: {
            type: Number,
            required: true
        },
        metadata: {
            type: Object
        }
    },
    {
        timestamps: true
    }
);

ticketSchema.plugin(mongooseAggregatePaginate);

export const Ticket = mongoose.model("Ticket", ticketSchema);
