const { Sequelize } = require("sequelize");

const AltUserBadgeModel = (db) => db.define('UserBadges', {
    user_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, },
    awarded_at: { type: Sequelize.DATE }
}, {
    tableName: 'user_badges',
    timestamps: false,
});
module.exports.AltUserBadgeModel = AltUserBadgeModel;