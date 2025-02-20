const { Sequelize } = require("sequelize");

const OsuTeamModel = (db) => db.define('OsuTeam', {
    id: { type: Sequelize.INTEGER, primaryKey: true, },
    flag_url: { type: Sequelize.STRING, allowNull: false, },
    name: { type: Sequelize.STRING, allowNull: false, },
    short_name: { type: Sequelize.STRING, allowNull: false, },
}, {
    tableName: 'osu_teams',
    timestamps: false
});
module.exports.OsuTeamModel = OsuTeamModel;