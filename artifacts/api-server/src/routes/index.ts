import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import configRouter from "./config.js";
import categoriesRouter from "./categories.js";
import produitsRouter from "./produits.js";
import budgetsRouter from "./budgets.js";
import achatsRouter from "./achats.js";
import dashboardRouter from "./dashboard.js";
import rapportsRouter from "./rapports.js";
import backupRouter from "./backup.js";
import { initDatabase } from "../db/sqlite.js";

initDatabase();

const router: IRouter = Router();

router.use(healthRouter);
router.use("/config", configRouter);
router.use("/categories", categoriesRouter);
router.use("/produits", produitsRouter);
router.use("/budgets", budgetsRouter);
router.use("/achats", achatsRouter);
router.use(dashboardRouter);
router.use(rapportsRouter);
router.use(backupRouter);

export default router;
