const Repository = require("../models/repoModel");

const authorizeMiddleware = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user;

    try {
        const repository = await Repository.findById(id);

        if (!repository) {
            return res.status(404).json({ error: "Repository not found" });
        }

        if (repository.owner.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Access denied" });
        }

        next();
    } catch (err) {
        return res.status(500).json({ error: "Server Error" });
    }
};

module.exports = authorizeMiddleware;