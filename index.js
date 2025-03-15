const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const domainsRoutes = require("./routes/domainsRoutes");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/domains", domainsRoutes);

module.exports = app;
