import { Router } from "express";
import { listUsers, createUser, updateUser, deleteUser } from "../controllers/userController.js";
import { authMiddleware, adminMiddleware } from "../middlewares/auth.js";

const router = Router();

// All user routes require admin
router.use(authMiddleware, adminMiddleware);

router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
