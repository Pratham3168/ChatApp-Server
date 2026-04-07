import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";
import dotenv from 'dotenv';
dotenv.config();




const isDevelopment = process.env.NODE_ENV !== "production";

const aj = arcjet({
  key: process.env.ARCJET_API_KEY,
  rules: [
    // Shield protects your app from common attacks e.g. SQL injection
    shield({ mode: isDevelopment ? "DRY_RUN" : "LIVE" }),
    // Create a bot detection rule
    detectBot({
      mode: isDevelopment ? "DRY_RUN" : "LIVE", // DRY_RUN in dev, Blocks requests in production
      // Block all bots except the following
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        // Uncomment to allow these other common bot categories
        // See the full list at https://arcjet.com/bot-list
        //"CATEGORY:MONITOR", // Uptime monitoring services
        //"CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
      ],
    }),
    // Create a token bucket rate limit. Other algorithms are supported.
    slidingWindow({
      mode: "LIVE", // Keep LIVE to test rate limiting
      // Tracked by IP address by default, but this can be customized
      // See https://docs.arcjet.com/fingerprints
      //characteristics: ["ip.src"],
      max:100,
      interval: 60, // Refill every 60 seconds
    }),
  ],
});


export default aj;