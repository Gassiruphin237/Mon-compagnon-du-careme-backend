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
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Le mot de passe actuel est incorrect." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Mot de passe mis à jour avec succès !" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour." });
  }
};
// VERIFIER OTP
export const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

        // Vérifier si déjà vérifié
        if (user.isVerified) return res.status(400).json({ error: "Compte déjà vérifié" });

        // Vérifier validité du code
        if (user.otpCode !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ error: "Code invalide ou expiré" });
        }

        // Valider le compte
        user.isVerified = true;
        user.otpCode = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({ message: "Compte activé avec succès ! Vous pouvez vous connecter." });
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
            return res.status(400).json({ error: "Email déjà utilisé" });
        }

        // 1. Générer un code OTP à 6 chiffres
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // Expire dans 10 min

        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Créer l'utilisateur (isVerified sera false par défaut via le modèle)
        const user = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            otpCode,
            otpExpires
        });

        // 3. Envoyer le mail OTP
        const messageHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
                <h2 style="color: #7c3aed; text-align: center;">Vérification OTP (Application Compagnon du Carême )</h2>
                <p>Paix et Joie <b>${name}</b>,</p>
                <p>Voici votre code de confirmation pour activer votre compte et débuter votre cheminement :</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; background: #f5f3ff; padding: 15px 25px; border-radius: 12px; border: 2px dashed #7c3aed;">
                        ${otpCode}
                    </span>
                </div>
                <p style="font-size: 12px; color: #64748b; text-align: center;">Ce code expirera dans 10 minutes.</p>
            </div>
        `;

        await sendEmail({
            email: user.email,
            subject: "Activez votre compte - Compagnon du Carême",
            html: messageHtml
        });

        res.status(201).json({
            message: "Utilisateur créé. Veuillez vérifier votre boîte mail pour le code OTP.",
            email: user.email 
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// Login
export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Utilisateur non trouvé" });

        // VERIFICATION DE L'ACTIVATION
        if (!user.isVerified) {
            return res.status(403).json({ error: "Votre compte n'est pas encore activé. Vérifiez vos mails." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Mot de passe incorrect" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.json({
            message: "Connexion réussie",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message });
    }
};
// UPDATE USER PROFILE (Infos de base)
export const updateUser = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: "Cet email est déjà utilisé par un autre compte." });
      }
      user.email = email;
    }
    if (name) user.name = name;
    if (phone) user.phone = phone;

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Profil mis à jour avec succès !",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la mise à jour du profil." });
  }
};