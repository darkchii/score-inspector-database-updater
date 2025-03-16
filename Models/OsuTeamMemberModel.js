const { Sequelize } = require("sequelize");

const OsuTeamMemberModel = (db) => db.define('OsuTeamMember', {
    team_id: { type: Sequelize.INTEGER, primaryKey: true, },
    user_id: { type: Sequelize.INTEGER, primaryKey: true, },
    is_leader: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
}, {
    tableName: 'osu_teams_members',
    timestamps: false
});
module.exports.OsuTeamMemberModel = OsuTeamMemberModel;