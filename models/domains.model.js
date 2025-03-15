const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const disabledSchema = new Schema({
  code: { type: String, required: false },
  note: { type: String, required: false },
  permanently: { type: Boolean, required: false },
  reason: { type: String, required: false },
});

const domainSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    state: { type: String, required: true },
    type: { type: String, required: true },
    web_prefix: { type: String, required: false },
    disabled: { type: disabledSchema, required: false },
    created_at: { type: Date, required: true },
  },
  { timestamps: true }
);

// Create index on name field for faster queries
domainSchema.index({ name: 1 });

const Domain = mongoose.model("Domain", domainSchema);

module.exports = Domain;
