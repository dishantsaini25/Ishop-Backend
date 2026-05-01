const rolePermissions = {
    super_admin: ['all'],
    admin: ['products', 'categories', 'brands', 'colors', 'orders', 'users'],
    manager: ['products', 'orders'],
    support: ['orders']
};

const checkPermission = (permission) => {
    return (req, res, next) => {
        const admin = req.admin;
        
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }
        
        if (admin.role === 'super_admin') {
            return next();
        }
        
        const hasPermission = rolePermissions[admin.role]?.includes(permission);
        
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: `Access denied. ${admin.role} cannot access ${permission}`
            });
        }
        
        next();
    };
};

module.exports = { checkPermission, rolePermissions };