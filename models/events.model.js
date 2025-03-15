const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    event: { type: String, required: true },
    timestamp: { type: Number, required: true },
    domain: { type: String, required: true },
    recipient: { type: String, required: false },
    message: { type: Schema.Types.Mixed, required: false },
    delivery_status: { type: Schema.Types.Mixed, required: false },
    reason: { type: String, required: false },
    severity: { type: String, required: false },
    tags: [{ type: String }],
    storage: { type: Schema.Types.Mixed, required: false },
    campaigns: [{ type: String }],
    user_variables: { type: Schema.Types.Mixed, required: false },
    flags: { type: Schema.Types.Mixed, required: false },
    routes: [{ type: Schema.Types.Mixed }],
    log_level: { type: String, required: false },
    envelope: { type: Schema.Types.Mixed, required: false },
    message_id: { type: String, required: false },
  },
  { timestamps: true }
);

// Create index on domain and timestamp for faster queries
eventSchema.index({ domain: 1, timestamp: 1 });
eventSchema.index({ event: 1 });

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
