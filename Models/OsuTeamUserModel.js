const { Sequelize } = require("sequelize");

const OsuTeamUserModel = (db) => db.define('OsuTeamUser', {
    id: { type: Sequelize.INTEGER, primaryKey: true, },
    mode: { type: Sequelize.INTEGER, primaryKey: true, },
    username: { type: Sequelize.STRING, allowNull: false, },
    last_updated: { type: Sequelize.DATE, allowNull: true, },
    count_300: { type: Sequelize.INTEGER, allowNull: true },
    count_100: { type: Sequelize.INTEGER, allowNull: true },
    count_50: { type: Sequelize.INTEGER, allowNull: true },
    count_miss: { type: Sequelize.INTEGER, allowNull: true },
    play_count: { type: Sequelize.INTEGER, allowNull: true },
    ranked_score: { type: Sequelize.INTEGER, allowNull: true },
    total_score: { type: Sequelize.INTEGER, allowNull: true },
    pp: { type: Sequelize.FLOAT, allowNull: true },
    global_rank: { type: Sequelize.INTEGER, allowNull: true },
    hit_accuracy: { type: Sequelize.FLOAT, allowNull: true },
    play_time: { type: Sequelize.INTEGER, allowNull: true },
    total_hits: { type: Sequelize.INTEGER, allowNull: true },
    maximum_combo: { type: Sequelize.INTEGER, allowNull: true },
    replays_watched: { type: Sequelize.INTEGER, allowNull: true },
    count_ssh: { type: Sequelize.INTEGER, allowNull: true },
    count_ss: { type: Sequelize.INTEGER, allowNull: true },
    count_sh: { type: Sequelize.INTEGER, allowNull: true },
    count_s: { type: Sequelize.INTEGER, allowNull: true },
    count_a: { type: Sequelize.INTEGER, allowNull: true },
}, {
    tableName: 'osu_users',
    timestamps: false
});
module.exports.OsuTeamUserModel = OsuTeamUserModel;