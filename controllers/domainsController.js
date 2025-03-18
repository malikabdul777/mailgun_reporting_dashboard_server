const axios = require("axios");

const getDomains = async (req, res) => {
  try {
    const { account } = req.params;
    const apiKey = process.env[`${account.toUpperCase()}_MAILGUN_API_KEY`];

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: `Mailgun API key for account ${account} is not configured`,
      });
    }

    const response = await axios.get("https://api.mailgun.net/v4/domains", {
      headers: {
        Authorization:
          "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
        "Content-Type": "application/json",
      },
    });

    return res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error("Error fetching domains:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch domains",
      error: error.message,
    });
  }
};

const getDomainStats = async (req, res) => {
  try {
    const { account, domain } = req.params;
    let { start, end } = req.query;

    // Convert dates to RFC 2822 format
    start = new Date(start).toUTCString();
    end = new Date(end).toUTCString();

    // Validate required parameters
    if (!account || !domain) {
      return res.status(400).json({
        success: false,
        message: "Account and domain parameters are required",
      });
    }

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: "Start and end dates are required",
      });
    }

    const apiKey = process.env[`${account.toUpperCase()}_MAILGUN_API_KEY`];

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: `Mailgun API key for account ${account} is not configured`,
      });
    }

    const query = new URLSearchParams({
      start,
      end,
    }).toString();

    // Fetch stats for multiple events in parallel
    const events = ["accepted", "delivered", "failed", "opened", "clicked"];
    const statsPromises = events.map((event) =>
      axios.get(
        `https://api.mailgun.net/v3/${domain}/stats/total?${query}&event=${event}`,
        {
          headers: {
            Authorization:
              "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
            "Content-Type": "application/json",
          },
        }
      )
    );

    const responses = await Promise.all(statsPromises);
    const combinedStats = responses.reduce((acc, response, index) => {
      acc[events[index]] = response.data;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: combinedStats,
    });
  } catch (error) {
    console.error("Error fetching domain stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch domain stats",
      error: error.message,
    });
  }
};

const getOverallStats = async (req, res) => {
  try {
    const { account } = req.params;
    let { start, end } = req.query;

    // Convert dates to RFC 2822 format
    start = new Date(start).toUTCString();
    end = new Date(end).toUTCString();

    if (!account) {
      return res.status(400).json({
        success: false,
        message: "Account parameter is required",
      });
    }

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: "Start and end dates are required",
      });
    }

    const apiKey = process.env[`${account.toUpperCase()}_MAILGUN_API_KEY`];

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: `Mailgun API key for account ${account} is not configured`,
      });
    }

    const query = new URLSearchParams({
      start,
      end,
    }).toString();

    const events = ["accepted", "delivered", "failed", "opened", "clicked"];
    const statsPromises = events.map((event) =>
      axios.get(
        `https://api.mailgun.net/v3/stats/total?${query}&event=${event}`,
        {
          headers: {
            Authorization:
              "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
            "Content-Type": "application/json",
          },
        }
      )
    );

    const responses = await Promise.all(statsPromises);
    const combinedStats = responses.reduce((acc, response, index) => {
      acc[events[index]] = response.data;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: combinedStats,
    });
  } catch (error) {
    console.error("Error fetching overall stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch overall stats",
      error: error.message,
    });
  }
};

const getDomainEvents = async (req, res) => {
  try {
    const { account, domain } = req.params;
    const { begin, end, ascending, limit, event } = req.query;

    // Validate required parameters
    if (!account || !domain) {
      return res.status(400).json({
        success: false,
        message: "Account and domain parameters are required",
      });
    }

    if (!begin || !end) {
      return res.status(400).json({
        success: false,
        message: "Begin and end dates are required",
      });
    }

    const apiKey = process.env[`${account.toUpperCase()}_MAILGUN_API_KEY`];

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: `Mailgun API key for account ${account} is not configured`,
      });
    }

    // Parse dates and ensure they're different
    let beginDate = new Date(begin);
    let endDate = new Date(end);

    // If dates are the same, add 1 day to end date
    if (beginDate.getTime() === endDate.getTime()) {
      endDate.setDate(endDate.getDate() + 1);
    }

    // Format dates to RFC 2822 format
    const beginRFC = beginDate.toUTCString();
    const endRFC = endDate.toUTCString();

    const query = new URLSearchParams({
      begin: beginRFC,
      end: endRFC,
      ascending: ascending || "yes",
      limit: limit || 300,
      event: event || "failed",
    }).toString();

    const response = await axios.get(
      `https://api.mailgun.net/v3/${domain}/events?${query}`,
      {
        headers: {
          Authorization:
            "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error("Error fetching domain events:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch domain events",
      error: error.message,
    });
  }
};

const getEventsPagination = async (req, res) => {
  try {
    const { account } = req.params;
    const { url } = req.query;

    // Validate required parameters
    if (!account) {
      return res.status(400).json({
        success: false,
        message: "Account parameter is required",
      });
    }

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL parameter is required",
      });
    }

    const apiKey = process.env[`${account.toUpperCase()}_MAILGUN_API_KEY`];

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: `Mailgun API key for account ${account} is not configured`,
      });
    }

    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(url);

    // Make request to the provided pagination URL
    const response = await axios.get(decodedUrl, {
      headers: {
        Authorization:
          "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
        "Content-Type": "application/json",
      },
    });

    return res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error("Error fetching paginated events:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch paginated events",
      error: error.message,
    });
  }
};

// Update module.exports
module.exports = {
  getDomains,
  getDomainStats,
  getOverallStats,
  getDomainEvents,
  getEventsPagination,
};
