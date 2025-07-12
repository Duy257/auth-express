export const adminPermission = (req, res, next) => {
  console.log(req.decoded);
  if (req.decoded.role !== "admin")
    res.status(403).json({
      message: "Access Denied",
    });
  next();
};
