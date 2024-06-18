const { Sequelize } = require("sequelize");

//convert NaN to null on pp
const ScoreModel = (db) => db.define('Score', {
    user_id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false, },
    beatmap_id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false, },
    score: { type: Sequelize.INTEGER, allowNull: false, },
    count300: { type: Sequelize.INTEGER, allowNull: false, },
    count100: { type: Sequelize.INTEGER, allowNull: false, },
    count50: { type: Sequelize.INTEGER, allowNull: false, },
    countmiss: { type: Sequelize.INTEGER, allowNull: false, },
    combo: { type: Sequelize.INTEGER, allowNull: false, },
    perfect: { type: Sequelize.INTEGER, allowNull: false, },
    enabled_mods: { type: Sequelize.INTEGER, allowNull: false, },
    date_played: { type: Sequelize.DATE, allowNull: false, },
    rank: { type: Sequelize.STRING, allowNull: false, },
    pp: { type: Sequelize.FLOAT, allowNull: false, },
    replay_available: { type: Sequelize.INTEGER, allowNull: false, },
    accuracy: { type: Sequelize.FLOAT, allowNull: false, }
}, {
    tableName: 'scores',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'beatmap_id']
        }
    ],
    hooks: {
        beforeCreate: (score) => {
            if (isNaN(score.pp) || score.pp === Infinity || score.pp === -Infinity || score.pp === 'NaN' || score.pp === 'Infinity' || score.pp === '-Infinity' || score.pp === null || score.pp === undefined) {
                score.pp = null;
            }
        }
    }
});
module.exports.ScoreModel = ScoreModel;