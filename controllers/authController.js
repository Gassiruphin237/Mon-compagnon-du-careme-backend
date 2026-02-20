import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendEmail.js";

// UPDATE PASSWORD
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; 

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Le mot de passe actuel est incorrect." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Mot de passe mis à jour avec succès !" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur lors de la mise à jour." });
  }
};

// VERIFIER OTP
export const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

        if (user.isVerified) return res.status(400).json({ error: "Compte déjà vérifié" });

        if (user.otpCode !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ error: "Code invalide ou expiré" });
        }

        user.isVerified = true;
        user.otpCode = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({ message: "Compte activé avec succès !" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// INSCRIPTION
export const register = async (req, res) => {
    const { name, email, phone, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Cet email est déjà utilisé" });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; 
        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. On crée l'utilisateur en base de données
        const user = await User.create({
            name, email, phone,
            password: hashedPassword,
            otpCode, otpExpires
        });

        // 2. On tente d'envoyer l'email
        try {
            const messageHtml = `
            <div style="font-family: Arial; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #7c3aed;">Code de vérification</h2>
                <p>Bonjour <b>${name}</b>,</p>
                <p>Votre code est : <b style="font-size: 24px;">${otpCode}</b></p>
            </div>`;
            await sendEmail({
                email: user.email,
                subject: "Activation de compte",
                html: messageHtml
            });

            res.status(201).json({ message: "Code OTP envoyé.", email: user.email });

        } catch (emailError) {
            await User.findByIdAndDelete(user._id);
            
            console.error("Erreur SMTP:", emailError);
            return res.status(400).json({ 
                error: "L'envoi de l'email a échoué. Vérifiez que l'adresse email est correcte ou existe réellement." 
            });
        }

    } catch (err) {
        res.status(500).json({ error: "Erreur serveur : " + err.message });
    }
};

// LOGIN
export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Email non reconnu" });

        if (!user.isVerified) {
            return res.status(403).json({ error: "Compte non activé. Vérifiez vos mails." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Mot de passe incorrect" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email, phone: user.phone }
        });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
};

// UPDATE PROFILE
export const updateUser = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) return res.status(400).json({ error: "Email déjà pris" });
      user.email = email;
    }
    if (name) user.name = name;
    if (phone) user.phone = phone;

    const updatedUser = await user.save();
    res.status(200).json({
      message: "Profil mis à jour",
      user: { id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, phone: updatedUser.phone }
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur de mise à jour" });
  }
};
