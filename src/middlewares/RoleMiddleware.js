// middlewares/RoleMiddleware.js

class RoleMiddleware {
    static allowRoles(...allowedRoles) {
        return (req, res, next) => {
            const user = req.user // Assumes user is already set by auth middleware (e.g. JWT decoded)

            if (!user || !allowedRoles.includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied: Insufficient role privileges"
                })
            }

            next()
        }
    }
}

module.exports = RoleMiddleware;
