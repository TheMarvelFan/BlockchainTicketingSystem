import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
    registerUser,
    loginUser,
    logoutUser,
    changeCurrentPassword,
    updateAccountDetails,
    getCurrentUser,
    switchUserRole
} from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/change-password").post(verifyJwt, changeCurrentPassword);
router.route("/update-account").patch(verifyJwt, updateAccountDetails);
router.route("/current-user").get(verifyJwt, getCurrentUser);
router.route("/switch-role/:newRole").post(verifyJwt, switchUserRole);

export default router;
