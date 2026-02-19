import jwt from "jsonwebtoken";
import User from "../models/User.js";

// export const protect = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ error: "Non autorisé, token manquant " });
//     }

//     const token = authHeader.split(" ")[1];

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     const user = await User.findById(decoded.id).select("-password");

//     if (!user) {
//       return res.status(401).json({ error: "Utilisateur non trouvé " });
//     }

//     req.user = user;

//     next();
//   } catch (error) {
//     return res.status(401).json({ error: "Token invalide " });
//   }
// };
export const protect = async (req, res, next) => {
  console.log("--- MIDDLEWARE AUTH APPELE ---"); 
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
       console.log("ERREUR: Pas de header authorization");
       return res.status(401).json({ error: "Pas de header" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("TOKEN DECODE AVEC SUCCES, ID:", decoded.id);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      console.log("ERREUR: Utilisateur non trouvé en BDD pour cet ID");
      return res.status(401).json({ error: "Utilisateur non trouvé" });
    }

    req.user = user;
    console.log("REQ.USER REMPLI, PASSAGE AU CONTROLEUR");
    next();
  } catch (error) {
    console.log("ERREUR CATCH MIDDLEWARE:", error.message);
    return res.status(401).json({ error: "Token invalide" });
  }
};