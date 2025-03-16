const { Sequelize } = require("sequelize");

const OsuTeamRulesetModel = (db) => db.define('OsuTeamRuleset', {
    id: { type: Sequelize.INTEGER, primaryKey: true, },
    mode: { type: Sequelize.STRING, primaryKey: true, },
    play_count: { type: Sequelize.INTEGER, allowNull: false, },
    ranked_score: { type: Sequelize.INTEGER, allowNull: false, },
    average_score: { type: Sequelize.INTEGER, allowNull: false, },
    performance: { type: Sequelize.INTEGER, allowNull: false, },
    clears: { type: Sequelize.INTEGER, allowNull: true},
    total_ss: { type: Sequelize.INTEGER, allowNull: true},
    total_s: { type: Sequelize.INTEGER, allowNull: true},
    total_a: { type: Sequelize.INTEGER, allowNull: true},
    total_score: { type: Sequelize.INTEGER, allowNull: true},
    play_time: { type: Sequelize.INTEGER, allowNull: true},
    total_hits: { type: Sequelize.INTEGER, allowNull: true},
    replays_watched: { type: Sequelize.INTEGER, allowNull: true},
}, {
    tableName: 'osu_teams_ruleset',
    timestamps: false
});
module.exports.OsuTeamRulesetModel = OsuTeamRulesetModel;