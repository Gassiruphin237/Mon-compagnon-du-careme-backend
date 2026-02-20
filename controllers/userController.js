import User from "../models/User.js";
import UserChallenge from "../models/UserChallenge.js";

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    await UserChallenge.deleteMany({ user: userId });

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    res.json({ message: "Compte et données associés supprimés avec succès." });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la suppression : " + err.message });
  }
};