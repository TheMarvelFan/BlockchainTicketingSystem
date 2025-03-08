import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const venueSchema = new Schema(
    { // can also previous number of events booked at venue, photos and videos of venue, reviews of venue, etc.
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "VenueManager",
            required: true
        },
        city: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        landmark: {
            type: String,
            required: false
        },
        area: {
            type: String,
            required: true
        },
        capacity: {
            type: Number,
            required: true
        },
        pinCode: {
            type: Number,
            required: true
        },
        coordinates: [
            {
                type: String,
                required: false
            }
        ]
    }
);

venueSchema.plugin(mongooseAggregatePaginate);

export const Venue = mongoose.model("Venue", venueSchema);
