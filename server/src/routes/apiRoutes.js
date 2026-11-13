import { Router } from "express";
import {
  getConflicts,
  getResources,
  postSync
} from "../controllers/syncController.js";

const router = Router();

router.get("/resources", getResources);
router.get("/conflicts", getConflicts);
router.post("/sync", postSync);

export default router;
