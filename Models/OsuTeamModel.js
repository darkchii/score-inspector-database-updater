const { Sequelize } = require("sequelize");

const OsuTeamModel = (db) => db.define('OsuTeam', {
    id: { type: Sequelize.INTEGER, primaryKey: true, },
    name: { type: Sequelize.STRING, allowNull: false, },
    short_name: { type: Sequelize.STRING, allowNull: true, },
    flag_url: { type: Sequelize.STRING, allowNull: true, },
    members: { type: Sequelize.INTEGER, allowNull: false, },
    last_updated: { type: Sequelize.DATE, allowNull: false, },
    deleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    last_scraped: { type: Sequelize.DATE, allowNull: true, },
    applications_open: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
}, {
    tableName: 'osu_teams',
    timestamps: false
});
module.exports.OsuTeamModel = OsuTeamModel;