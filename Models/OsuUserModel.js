const { Sequelize } = require("sequelize");

const OsuUserModel = (db) => db.define('OsuUser', {
    user_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, },
    team_id: { type: Sequelize.INTEGER, allowNull: false, },
    username: { type: Sequelize.STRING, allowNull: false, },
    post_count: { type: Sequelize.INTEGER, allowNull: false, },
    comments_count: { type: Sequelize.INTEGER, allowNull: false, },
    level: { type: Sequelize.FLOAT, allowNull: false, },
    global_rank: { type: Sequelize.INTEGER, allowNull: false, },
    pp: { type: Sequelize.FLOAT, allowNull: false, },
    ranked_score: { type: Sequelize.BIGINT, allowNull: false, },
    playcount: { type: Sequelize.INTEGER, allowNull: false, },
    playtime: { type: Sequelize.INTEGER, allowNull: false, },
    total_score: { type: Sequelize.BIGINT, allowNull: false, },
    total_hits: { type: Sequelize.INTEGER, allowNull: false, },
    replays_watched: { type: Sequelize.INTEGER, allowNull: false, },
    ss_count: { type: Sequelize.INTEGER, allowNull: false, },
    ssh_count: { type: Sequelize.INTEGER, allowNull: false, },
    s_count: { type: Sequelize.INTEGER, allowNull: false, },
    sh_count: { type: Sequelize.INTEGER, allowNull: false, },
    a_count: { type: Sequelize.INTEGER, allowNull: false, },
    country_rank: { type: Sequelize.INTEGER, allowNull: false, },
    hit_accuracy: { type: Sequelize.FLOAT, allowNull: false, },
    b_count: { type: Sequelize.INTEGER, allowNull: false, },
    c_count: { type: Sequelize.INTEGER, allowNull: false, },
    d_count: { type: Sequelize.INTEGER, allowNull: false, },
    total_pp: { type: Sequelize.FLOAT, allowNull: false, },
    country_ss_rank: { type: Sequelize.INTEGER, allowNull: false, },
    country_ss_rank_highest: { type: Sequelize.INTEGER, allowNull: false, },
    country_ss_rank_highest_date: { type: Sequelize.DATE, allowNull: false, },
    global_ss_rank: { type: Sequelize.INTEGER, allowNull: false, },
    global_ss_rank_highest: { type: Sequelize.INTEGER, allowNull: false, },
    global_ss_rank_highest_date: { type: Sequelize.DATE, allowNull: false, },
    country_code: { type: Sequelize.STRING, allowNull: false, },
    country_name: { type: Sequelize.STRING, allowNull: false, },
    alt_ssh_count: { type: Sequelize.INTEGER, allowNull: false, },
    alt_ss_count: { type: Sequelize.INTEGER, allowNull: false, },
    alt_s_count: { type: Sequelize.INTEGER, allowNull: false, },
    alt_sh_count: { type: Sequelize.INTEGER, allowNull: false, },
    alt_a_count: { type: Sequelize.INTEGER, allowNull: false, },
    medals: { type: Sequelize.JSON, allowNull: false, },
    badges: { type: Sequelize.JSON, allowNull: false, },
}, {
    tableName: 'osu_users',
    timestamps: false
});
module.exports.OsuUserModel = OsuUserModel;