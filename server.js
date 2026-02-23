import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth.js";
import challengeRoutes from "./routes/challenges.js";

dotenv.config();
const app = express();

const allowedOrigins = [
  'https://mon-compagnon-du-careme.vercel.app', 
  'http://localhost:5173', 
  'http://192.168.50.169:5173'
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
 
// --- GESTION DE LA CONNEXION MONGODB (Version Vercel) ---
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) return;
    
    await mongoose.connect(process.env.MONGO_URI, {
      // Ces options empêchent le buffering infini
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false, 
    });
    console.log("MongoDB connecté");
  } catch (err) {
    console.error("Erreur critique MongoDB :", err);
  }
};

// Middleware pour s'assurer que la DB est connectée avant de traiter une requête
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/challenges", challengeRoutes); 

app.get("/", (req, res) => {
  res.send("Compagnon du Carême API fonctionne");
});

// Important pour Vercel : ne pas utiliser app.listen en production
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 7500;
    app.listen(PORT, () => {
        console.log(`Serveur local sur le port ${PORT}`);
    });
}

export default app;
