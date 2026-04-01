import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import clinicRoutes from "./routes/clinic.routes";
import userRoutes from "./routes/user.routes";
import appointmentRoutes from "./routes/appointment.routes";
import { connectDb } from "./services/db.service";

dotenv.config();


const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/clinics", clinicRoutes);
app.use("/api/users", userRoutes);
app.use("/api/appointments", appointmentRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "epr-backend",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
  res.status(200).json({
    message: "EPR backend running",
    docs: "/health",
  });
});
const port = Number(process.env.PORT) || 4000;


const start = async () => {
  try {
    await connectDb(); 
    app.listen(port, "0.0.0.0" , () => {
      // eslint-disable-next-line no-console
      console.log(`EPR backend listening on http://localhost:${port}`);
    }); 
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();
