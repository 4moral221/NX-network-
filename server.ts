import "dotenv/config";
import express from "express";
import cors from "cors";
import { apiLimiter } from "./src/server/core";
import adminRouter from "./src/server/routes/admin";
import authRouter from "./src/server/routes/auth";
import devAuthRouter from "./src/server/routes/dev_auth";
import familyAccountsRouter from "./src/server/routes/family_accounts";
import fmcgRouter from "./src/server/routes/fmcg";
import geminiRouter from "./src/server/routes/gemini";
import logisticsRouter from "./src/server/routes/logistics";
import miscRouter from "./src/server/routes/misc";
import onboardingRouter from "./src/server/routes/onboarding";
import redisRouter from "./src/server/routes/redis";
import staffRouter from "./src/server/routes/staff";
import ussdRouter from "./src/server/routes/ussd";
import { bootstrap } from "./src/server/bootstrap";

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use('/api/', apiLimiter);

// Middleware for parsing form data (used by Africa's Talking)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(adminRouter);
app.use(authRouter);
app.use(devAuthRouter);
app.use(familyAccountsRouter);
app.use(fmcgRouter);
app.use(geminiRouter);
app.use(logisticsRouter);
app.use(miscRouter);
app.use(onboardingRouter);
app.use(redisRouter);
app.use(staffRouter);
app.use(ussdRouter);

// Global Error Handler for API routes
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    path: req.path
  });
});

// Boot the server & asset-serving middleware
bootstrap(app);

export default app;

