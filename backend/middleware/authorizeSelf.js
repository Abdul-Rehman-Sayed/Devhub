const authorizeSelf = (req, res, next) => {
  if (!req.user || req.user.toString() !== req.params.id.toString()) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
};

module.exports = authorizeSelf;
