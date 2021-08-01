import app from "../js/app";
import Log from "../js/logger";

app.start((config: any) => {
  const bindAddress = config.address ? config.address : "localhost";
  const httpType = config.useHttps ? "https" : "http";
  Log.log("\nReady to go! Please point your browser to: " + httpType + "://" + bindAddress + ":" + config.port);
});
