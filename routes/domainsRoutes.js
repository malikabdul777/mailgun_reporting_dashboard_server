const express = require("express");
const router = express.Router();
const {
  getDomains,
  getDomainStats,
  getOverallStats,
  getDomainEvents,
  getEventsPagination,
} = require("../controllers/domainsController");

// GET /api/domains - Get all domains
router.get("/:account", getDomains);

// GET /api/domains/stats - Get domain statistics
router.get("/stats/:account/:domain", getDomainStats);

// GET /api/domains/stats/account - Get overall statistics
router.get("/stats/:account", getOverallStats);

// GET /api/domains/events/pagination - Get paginated events
router.get("/events/pagination/:account", getEventsPagination);

// GET /api/domains/events - Get domain events
router.get("/events/:account/:domain", getDomainEvents);

module.exports = router;
