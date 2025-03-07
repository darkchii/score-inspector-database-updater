const { Sequelize } = require("sequelize");

const OsuTeamRulesetModel = (db) => db.define('OsuTeamRuleset', {
    id: { type: Sequelize.INTEGER, primaryKey: true, },
    mode: { type: Sequelize.STRING, primaryKey: true, },
    play_count: { type: Sequelize.INTEGER, allowNull: false, },
    ranked_score: { type: Sequelize.INTEGER, allowNull: false, },
    average_score: { type: Sequelize.INTEGER, allowNull: false, },
    performance: { type: Sequelize.INTEGER, allowNull: false, },
}, {
    tableName: 'osu_teams_ruleset',
    timestamps: false
});
module.exports.OsuTeamRulesetModel = OsuTeamRulesetModel;