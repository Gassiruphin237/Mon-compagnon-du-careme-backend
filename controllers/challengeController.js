import Challenge from "../models/Challenge.js";
import UserChallenge from "../models/UserChallenge.js";

const startDate = new Date("2026-02-18T00:00:00");

export const completeTodayChallenge = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays >= 40) {
      return res.status(400).json({ error: "Nous ne sommes pas en période de Carême." });
    }

    const dayNumber = diffDays + 1;

    const alreadyDone = await UserChallenge.findOne({
      user: req.user.id,
      day_number: dayNumber
    });

    if (alreadyDone) {
      return res.status(400).json({ error: "Ce défi est déjà accompli aujourd’hui." });
    }

    await UserChallenge.create({
      user: req.user.id,
      day_number: dayNumber
    });

    res.json({ message: "Défi marqué comme accompli !" });

  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la validation : " + err.message });
  }
};

export const getTodayChallenge = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays >= 40) {
      return res.status(400).json({ error: "Hors période du Carême 2026." });
    }

    const dayNumber = diffDays + 1;
    const challenge = await Challenge.findOne({ day_number: dayNumber });

    const isDone = await UserChallenge.findOne({
      user: req.user.id,
      day_number: dayNumber
    });

    const completedCount = await UserChallenge.countDocuments({ user: req.user.id });

    res.json({
      day: dayNumber,
      progression: `${completedCount}/40`,
      challenge,
      completed: !!isDone
    });

  } catch (err) {
    res.status(500).json({ error: "Erreur de récupération : " + err.message });
  }
};

export const getAllChallenges = async (req, res) => {
  try {
    const allChallenges = await Challenge.find().sort({ day_number: 1 });
    const userCompleted = await UserChallenge.find({ user: req.user.id });
    const completedDayNumbers = new Set(userCompleted.map(uc => uc.day_number));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
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
    res.status(500).json({ error: "Erreur lors du chargement." });
  }
};