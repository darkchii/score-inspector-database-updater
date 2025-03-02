const { Sequelize } = require("sequelize");

const InspectorUserModel = (db) => db.define('InspectorUser', {
    id: { type: Sequelize.INTEGER, primaryKey: true },
    osu_id: { type: Sequelize.INTEGER, allowNull: false },
}, {
    tableName: 'inspector_users',
    timestamps: false
});
module.exports.InspectorUserModel = InspectorUserModel;