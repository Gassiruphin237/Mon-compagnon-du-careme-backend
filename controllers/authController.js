import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendEmail.js";
import dns from "dns"; 
import { promisify } from "util";

// Transformation de la fonction DNS en version "Async/Await"
const resolveMx = promisify(dns.resolveMx);

// --- INSCRIPTION (REGISTER) ---
export const register = async (req, res) => {
    const { name, email, phone, password } = req.body;

    try {
        // 1. Validation de la syntaxe de l'email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Le format de l'email est invalide." });
        }

        // 2. Vérification de l'existence du domaine via DNS (MX Records)
        const domain = email.split("@")[1];
        try {
            const mxRecords = await resolveMx(domain);
            if (!mxRecords || mxRecords.length === 0) {
                return res.status(400).json({ 
                    error: `Le domaine @${domain} ne peut pas recevoir d'emails.` 
                });
            }
        } catch (dnsErr) {
            return res.status(400).json({ 
                error: `L'email est invalide : le domaine @${domain} est introuvable.` 
            });
        }

        // 3. Vérification si déjà en base
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Cet email est déjà associé à un compte." });
        }

        // 4. Hachage du mot de passe et OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; 
        const hashedPassword = await bcrypt.hash(password, 10);

        // 5. Création temporaire de l'utilisateur
        const user = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            otpCode,
            otpExpires
        });

        // 6. Envoi de l'email
        try {
            const messageHtml = `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #7c3aed;">Code d'activation</h2>
                    <p>Bonjour <b>${name}</b>,</p>
                    <p>Votre code pour le Compagnon du Carême est :</p>
                    <div style="font-size: 24px; font-weight: bold; color: #4f46e5; margin: 10px 0;">${otpCode}</div>
                    <p style="font-size: 12px; color: #666;">Ce code expire dans 10 minutes.</p>
                </div>`;

            await sendEmail({
                email: user.email,
                subject: "Activez votre compte - Compagnon du Carême",
                html: messageHtml
            });

            res.status(201).json({ 
                message: "Utilisateur créé. Vérifiez votre boîte mail.", 
                email: user.email 
            });

        } catch (emailError) {
            // Rollback : On supprime l'utilisateur si le mail ne part pas
            await User.findByIdAndDelete(user._id);
            console.error("Erreur SMTP:", emailError);
            return res.status(400).json({ 
                error: "Échec de l'envoi de l'email. Vérifiez votre adresse." 
            });
        }

    } catch (err) {
        res.status(500).json({ error: "Erreur serveur : " + err.message });
    }
};

// --- CONNEXION (LOGIN) ---
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

// --- VERIFICATION OTP ---
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
        res.status(500).json({ error: "Erreur lors de la vérification" });
    }
};

// --- MISE À JOUR MOT DE PASSE ---
export const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id; 

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: "Le mot de passe actuel est incorrect." });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: "Mot de passe mis à jour avec succès !" });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur lors de la mise à jour." });
    }
};

// --- MISE À JOUR PROFIL ---
export const updateUser = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) return res.status(400).json({ error: "Cet email est déjà utilisé." });
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