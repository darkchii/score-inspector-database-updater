const { Sequelize } = require("sequelize");

const OsuUserRulesetDataModel = (db) => db.define('OsuUserRulesetData', {
    id: { type: Sequelize.INTEGER, primaryKey: true },
    ruleset: { type: Sequelize.STRING, primaryKey: true },
    count_300: { type: Sequelize.INTEGER, allowNull: true },
    count_100: { type: Sequelize.INTEGER, allowNull: true },
    count_50: { type: Sequelize.INTEGER, allowNull: true },
    count_miss: { type: Sequelize.INTEGER, allowNull: true },
    level: { type: Sequelize.FLOAT, allowNull: true },
    global_rank: { type: Sequelize.INTEGER, allowNull: true },
    pp: { type: Sequelize.FLOAT, allowNull: true },
    ranked_score: { type: Sequelize.INTEGER, allowNull: true },
    hit_accuracy: { type: Sequelize.FLOAT, allowNull: true },
    play_count: { type: Sequelize.INTEGER, allowNull: true },
    play_time: { type: Sequelize.INTEGER, allowNull: true },
    total_score: { type: Sequelize.INTEGER, allowNull: true },
    total_hits: { type: Sequelize.INTEGER, allowNull: true },
    maximum_combo: { type: Sequelize.INTEGER, allowNull: true },
    replays_watched_by_others: { type: Sequelize.INTEGER, allowNull: true },
    is_ranked: { type: Sequelize.BOOLEAN, allowNull: true },
    grade_count_ss: { type: Sequelize.INTEGER, allowNull: true },
    grade_count_ssh: { type: Sequelize.INTEGER, allowNull: true },
    grade_count_s: { type: Sequelize.INTEGER, allowNull: true },
    grade_count_sh: { type: Sequelize.INTEGER, allowNull: true },
    grade_count_a: { type: Sequelize.INTEGER, allowNull: true },
    country_rank: { type: Sequelize.INTEGER, allowNull: true },
    last_updated: { type: Sequelize.DATE, allowNull: true },
}, {
    tableName: 'osu_users_ruleset_data',
    timestamps: false
});
module.exports.OsuUserRulesetDataModel = OsuUserRulesetDataModel;