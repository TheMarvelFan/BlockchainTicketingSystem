import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
    const response = new ApiResponse(200, "OK", "Healthcheck successful");
    return res.status(response.statusCode).json(response);
});

export { healthcheck };
