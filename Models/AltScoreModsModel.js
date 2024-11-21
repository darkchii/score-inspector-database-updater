const { Sequelize } = require("sequelize");
const moment = require("moment");

const AltScoreModsModel = (db) => db.define('ScoreMods', {
    user_id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false, },
    beatmap_id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false, },
    //pgsql jsonb
    mods: { type: Sequelize.JSONB, allowNull: false, },
    date_played: {
        type: Sequelize.DATE,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('date_played');
            return moment(rawValue).format('YYYY-MM-DDTHH:mm:ss[Z]');
        },
    },
    star_rating: { type: Sequelize.FLOAT, allowNull: false, },
    aim_difficulty: { type: Sequelize.FLOAT, allowNull: false, },
    speed_difficulty: { type: Sequelize.FLOAT, allowNull: false, },
    speed_note_count: { type: Sequelize.FLOAT, allowNull: false, },
    flashlight_difficulty: { type: Sequelize.FLOAT, allowNull: false, },
    aim_difficult_strain_count: { type: Sequelize.FLOAT, allowNull: false, },
    speed_difficult_strain_count: { type: Sequelize.FLOAT, allowNull: false, },
    approach_rate: { type: Sequelize.FLOAT, allowNull: false, },
    overall_difficulty: { type: Sequelize.FLOAT, allowNull: false, },
    drain_rate: { type: Sequelize.FLOAT, allowNull: false, },
    max_combo: { type: Sequelize.INTEGER, allowNull: false, },
    date_attributes: { type: Sequelize.DATE, allowNull: false, },
}, {
    tableName: 'scoresmods',
    timestamps: false,
});
module.exports.AltScoreModsModel = AltScoreModsModel;