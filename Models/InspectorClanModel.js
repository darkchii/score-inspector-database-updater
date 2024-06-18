const { Sequelize } = require("sequelize");

const InspectorClanModel = (db) => db.define('InspectorClan', {
    id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
    name: { type: Sequelize.STRING, allowNull: false, },
    tag: { type: Sequelize.STRING, allowNull: false, },
    color: { type: Sequelize.STRING, allowNull: false, },
    creation_date: { type: Sequelize.DATE, allowNull: false, },
    description: { type: Sequelize.STRING, allowNull: false, },
    owner: { type: Sequelize.INTEGER, allowNull: false, },
    header_image_url: { type: Sequelize.STRING, allowNull: true, },
}, {
    tableName: 'inspector_clans',
    timestamps: false
});
module.exports.InspectorClanModel = InspectorClanModel;