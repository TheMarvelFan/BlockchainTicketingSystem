import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post();
router.route("/login").post();
router.route("/logout").post(verifyJwt);
router.route("/change-password").post(verifyJwt);
router.route("/update-account").patch(verifyJwt);
router.route("/current-user").get(verifyJwt);
router.route("/switch-role/:newRole").post(verifyJwt);

export default router;
