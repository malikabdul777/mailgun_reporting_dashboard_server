const axios = require("axios");

// Common timeout value for all API requests
const API_TIMEOUT = 10000; // 10 seconds

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

    // Create an axios instance with timeout and retry logic
    const mailgunApi = axios.create({
      timeout: API_TIMEOUT,
      headers: {
        Authorization:
          "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
        "Content-Type": "application/json",
      },
    });

    // Add retry with exponential backoff
    let retries = 0;
    const maxRetries = 3;
    let response;

    while (retries < maxRetries) {
      try {
        response = await mailgunApi.get("https://api.mailgun.net/v4/domains");
        break; // Success, exit the retry loop
      } catch (error) {
        retries++;
        if (retries >= maxRetries) throw error; // Max retries reached, rethrow

        // Exponential backoff: wait longer between each retry
        const delay = Math.pow(2, retries) * 500; // 1s, 2s, 4s
        console.warn(
          `Retry ${retries}/${maxRetries} for domains after ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

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

    // Create an axios instance with timeout
    const mailgunApi = axios.create({
      timeout: API_TIMEOUT,
      headers: {
        Authorization:
          "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
        "Content-Type": "application/json",
      },
    });

    // Fetch stats for multiple events in parallel with improved error handling
    const events = ["accepted", "delivered", "failed", "opened", "clicked"];

    // Use a more efficient approach with Promise.allSettled and better error handling
    const statsPromises = events.map((event) => {
      const url = `https://api.mailgun.net/v3/${domain}/stats/total?${query}&event=${event}`;
      return mailgunApi.get(url).catch((error) => {
        // Detailed error logging
        console.warn(
          `Error fetching stats for ${domain}, event ${event}:`,
          error.message
        );
        if (error.response) {
          console.warn(
            `Status: ${error.response.status}, Data:`,
            error.response.data
          );
        }
        // Return a placeholder for failed requests
        return {
          data: {
            event,
            items: [],
            message: "Failed to fetch data",
            error: error.message,
          },
        };
      });
    });

    const responses = await Promise.allSettled(statsPromises);
    const combinedStats = {};

    // Process responses, including those that failed
    responses.forEach((result, index) => {
      const event = events[index];
      if (result.status === "fulfilled" && result.value.data) {
        combinedStats[event] = result.value.data;
      } else {
        combinedStats[event] = {
          error: true,
          message: result.reason?.message || "Failed to fetch data",
        };
      }
    });

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

    // Set a reasonable timeout for API requests
    const timeout = 10000; // 10 seconds

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

    // Create an axios instance with timeout
    const mailgunApi = axios.create({
      timeout,
      headers: {
        Authorization:
          "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
        "Content-Type": "application/json",
      },
    });

    // Use Promise.allSettled instead of Promise.all to handle partial failures
    const statsPromises = events.map((event) =>
      mailgunApi
        .get(`https://api.mailgun.net/v3/stats/total?${query}&event=${event}`)
        .catch((error) => {
          console.warn(
            `Error fetching stats for event ${event}:`,
            error.message
          );
          // Return a placeholder for failed requests
          return {
            data: { event, items: [], message: "Failed to fetch data" },
          };
        })
    );

    const responses = await Promise.allSettled(statsPromises);
    const combinedStats = {};

    // Process responses, including those that failed
    responses.forEach((result, index) => {
      const event = events[index];
      if (result.status === "fulfilled" && result.value.data) {
        combinedStats[event] = result.value.data;
      } else {
        // Include error information in the response
        combinedStats[event] = {
          error: true,
          message: result.reason?.message || "Failed to fetch data",
        };
      }
    });

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

    // Use default values for optional parameters
    const eventType = event || "failed";
    const ascendingValue = ascending || "yes";
    const limitValue = limit || 300;

    const query = new URLSearchParams({
      begin: beginRFC,
      end: endRFC,
      ascending: ascendingValue,
      limit: limitValue,
      event: eventType,
    }).toString();

    // Create an axios instance with timeout
    const mailgunApi = axios.create({
      timeout: API_TIMEOUT,
      headers: {
        Authorization:
          "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
        "Content-Type": "application/json",
      },
    });

    // Add retry logic for reliability
    let retries = 0;
    const maxRetries = 2;
    let response;

    while (retries <= maxRetries) {
      try {
        response = await mailgunApi.get(
          `https://api.mailgun.net/v3/${domain}/events?${query}`
        );
        break; // Success, exit the retry loop
      } catch (error) {
        retries++;
        if (retries > maxRetries) throw error; // Max retries reached, rethrow

        // Exponential backoff
        const delay = Math.pow(2, retries) * 500;
        console.warn(
          `Retry ${retries}/${maxRetries} for domain events after ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

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

    // Validate the URL to ensure it's a Mailgun API URL for security
    if (!decodedUrl.startsWith("https://api.mailgun.net/")) {
      return res.status(400).json({
        success: false,
        message: "Invalid URL: Only Mailgun API URLs are allowed",
      });
    }

    // Create an axios instance with timeout
    const mailgunApi = axios.create({
      timeout: API_TIMEOUT,
      headers: {
        Authorization:
          "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
        "Content-Type": "application/json",
      },
    });

    // Add retry logic for reliability
    let retries = 0;
    const maxRetries = 2;
    let response;

    while (retries <= maxRetries) {
      try {
        // Make request to the provided pagination URL
        response = await mailgunApi.get(decodedUrl);
        break; // Success, exit the retry loop
      } catch (error) {
        retries++;
        if (retries > maxRetries) throw error; // Max retries reached, rethrow

        // Exponential backoff
        const delay = Math.pow(2, retries) * 500;
        console.warn(
          `Retry ${retries}/${maxRetries} for pagination URL after ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

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
