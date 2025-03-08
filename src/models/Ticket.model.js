import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const ticketSchema = new Schema(
    {
        // we also need an image here because all tickets of an event will have the same art on them
        // eventName (for which it is sold)
        // eventStart and eventEnd time
        // we also need a "used" label for the ticket
    },
    {
        timestamps: true
    }
);

ticketSchema.plugin(mongooseAggregatePaginate);

export const Ticket = mongoose.model("Ticket", ticketSchema);
