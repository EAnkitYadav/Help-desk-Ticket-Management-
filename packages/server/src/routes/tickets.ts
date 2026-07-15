import { Router } from "express";
import {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  addMessage,
  getDashboardStats,
} from "../controllers/ticketController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router: Router = Router();

// All ticket routes require authentication
router.use(authMiddleware);

router.get("/", listTickets);
router.post("/", createTicket);
router.get("/:id", getTicket);
router.patch("/:id", updateTicket);
router.post("/:id/messages", addMessage);

export default router;

// Dashboard route (exported separately)
export const dashboardRouter: Router = Router();
dashboardRouter.use(authMiddleware);
dashboardRouter.get("/stats", getDashboardStats);
