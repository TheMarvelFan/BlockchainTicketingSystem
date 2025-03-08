import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const eventSchema = new Schema(
    { // can add feature to mark event as private or public, and create a new schema for special guests to add
        // photos and videos, description, name, etc.
        verifiers: [
            {
                type: Schema.Types.ObjectId,
                ref: "Verifier"
            }
        ],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "Seller",
            required: true
        },
        venue: {
            type: Schema.Types.ObjectId,
            ref: "Venue",
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        specialGuest: {
            type: String,
            required: false
        },
        startDateAndTime: {
            type: Date,
            required: true
        },
        endDateAndTime: {
            type: Date,
            required: true
        },
        maxTickets: {
            type: Number,
            required: true
        },
        expired: {
            type: Boolean,
            default: false
        },
        duration: {
            type: Number,
            required: true
        }
    },
    {
        timestamps: true
    }
);

eventSchema.plugin(mongooseAggregatePaginate);

export const Event = mongoose.model("Event", eventSchema);
