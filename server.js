import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth.js";
import challengeRoutes from "./routes/challenges.js";

dotenv.config();
const app = express();

// Middleware
// app.use(cors());
// app.use(cors({
//   origin: ["http://192.168.50.171:5173", "http://localhost:5173"], 
//   credentials: true
// }));

const corsOptions = {
  origin: 'https://mon-compagnon-du-careme.vercel.app', 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, 
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
  
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/challenges", challengeRoutes); 

app.get("/", (req, res) => {
  res.send("Compagnon du Carême API fonctionne");
});

const PORT = process.env.PORT || 7500;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log(" MongoDB connecté");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Serveur lancé sur : http://localhost:${PORT}`);
      console.log(` Accès réseau local : http://YOUR_IP_ADDRESS:${PORT}`);
    });
  })
  .catch(err => console.log(" Erreur MongoDB :", err));
