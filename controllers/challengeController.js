import Challenge from "../models/Challenge.js";
import UserChallenge from "../models/UserChallenge.js";



const startDate = new Date("2026-02-18T00:00:00");

export const completeTodayChallenge = async (req, res) => {
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays >= 40) {
      return res.status(400).json({ message: "Hors période du Carême" });
    }

    const dayNumber = diffDays + 1;

    // Vérifier si déjà accompli
    const alreadyDone = await UserChallenge.findOne({
      user: req.user._id,
      day_number: dayNumber
    });

    if (alreadyDone) {
      return res.status(400).json({ message: "Déjà accompli aujourd’hui " });
    }

    await UserChallenge.create({
      user: req.user._id,
      day_number: dayNumber
    });

    res.json({ message: "Défi marqué comme accompli " });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getTodayChallenge = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays >= 40) {
      return res.status(400).json({
        message: "Nous ne sommes pas dans la période du Carême 2026"
      });
    }

    const dayNumber = diffDays + 1;
    const challenge = await Challenge.findOne({ day_number: dayNumber });

    // --- AJOUT : Vérifier si l'utilisateur a déjà complété CE défi aujourd'hui ---
    const isDone = await UserChallenge.findOne({
      user: req.user._id,
      day_number: dayNumber
    });

    // Calcul progression
    const completedCount = await UserChallenge.countDocuments({
      user: req.user._id
    });

    // On renvoie "completed: true" si isDone n'est pas nul
    res.json({
      day: dayNumber,
      progression: `${completedCount}/40`,
      challenge,
      completed: !!isDone // C'est cette ligne qui va faire disparaître ton bouton !
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllChallenges = async (req, res) => {
  try {
    const allChallenges = await Challenge.find().sort({ day_number: 1 });
    const userCompleted = await UserChallenge.find({ user: req.user._id });
    const completedDayNumbers = new Set(userCompleted.map(uc => uc.day_number));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Calcul du jour actuel (1 à 40)
    const currentDayNumber = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const challengesWithStatus = allChallenges.map(challenge => {
      const isDone = completedDayNumbers.has(challenge.day_number);
      const isPast = challenge.day_number < currentDayNumber;

      return {
        _id: challenge._id,
        dayNumber: challenge.day_number,
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        completed: isDone,
        isCurrent: challenge.day_number === currentDayNumber,
        isLocked: challenge.day_number > currentDayNumber,
        isMissed: isPast && !isDone 
      };
    });

    res.json(challengesWithStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};