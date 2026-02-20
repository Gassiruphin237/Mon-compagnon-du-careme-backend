import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth.js";
import challengeRoutes from "./routes/challenges.js";

dotenv.config();
const app = express();

// --- CONFIGURATION CORS MULTI-ORIGINES ---
const allowedOrigins = [
  'https://mon-compagnon-du-careme.vercel.app', 
  'http://localhost:5173',                      
  'http://127.0.0.1:5173'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Refusé par la politique CORS'));
    }
  },
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

// Modification pour Vercel : On lance le serveur même si MongoDB met du temps
app.listen(PORT, () => {
    console.log(`Serveur prêt sur le port ${PORT}`);
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connecté"))
  .catch(err => console.log("Erreur MongoDB :", err));

export default app; 
