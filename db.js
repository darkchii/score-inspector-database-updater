const { Sequelize } = require("sequelize");
const { ScoreModel } = require("./Models/ScoreModel");
const { InspectorUserMilestoneModel } = require("./Models/InspectorUserMilestoneModel");
const { OsuUserModel } = require("./Models/OsuUserModel");
const { AltUserModel } = require("./Models/AltUserModel");
const { InspectorClanModel } = require("./Models/InspectorClanModel");
const { InspectorClanMemberModel } = require("./Models/InspectorClanMemberModel");
const { InspectorClanStatsModel } = require("./Models/InspectorClanStatsModel");
const { InspectorScoreStatModel } = require("./Models/InspectorScoreStatModel");
const { InspectorHistoricalScoreRankModel } = require("./Models/InspectorHistoricalScoreRankMode");
require('dotenv').config();

let databases = {
    inspector: new Sequelize(process.env.MYSQL_DB, process.env.MYSQL_USER, process.env.MYSQL_PASS, { host: process.env.MYSQL_HOST, dialect: 'mariadb', timezone: 'Europe/Amsterdam', logging: false }),
    osuAlt: new Sequelize(process.env.ALT_DB_DATABASE, process.env.ALT_DB_USER, process.env.ALT_DB_PASSWORD, { host: process.env.ALT_DB_HOST, dialect: 'postgres', logging: false })
};
module.exports.Databases = databases;

const InspectorOsuUser = OsuUserModel(databases.inspector);
const InspectorUserMilestone = InspectorUserMilestoneModel(databases.inspector);
const InspectorClan = InspectorClanModel(databases.inspector);
const InspectorClanMember = InspectorClanMemberModel(databases.inspector);
const InspectorClanStats = InspectorClanStatsModel(databases.inspector);
const InspectorScoreStat = InspectorScoreStatModel(databases.inspector);
const InspectorHistoricalScoreRankOsu = InspectorHistoricalScoreRankModel(databases.inspector, 'osu');
const InspectorHistoricalScoreRankTaiko = InspectorHistoricalScoreRankModel(databases.inspector, 'taiko');
const InspectorHistoricalScoreRankMania = InspectorHistoricalScoreRankModel(databases.inspector, 'mania');
const InspectorHistoricalScoreRankFruits = InspectorHistoricalScoreRankModel(databases.inspector, 'fruits');


const AltScore = ScoreModel(databases.osuAlt);
const AltUser = AltUserModel(databases.osuAlt);

InspectorClanStats.belongsTo(InspectorClan, { as: 'clan', foreignKey: 'clan_id', targetKey: 'id' });
InspectorClan.hasOne(InspectorClanStats, { as: 'clan_stats', foreignKey: 'clan_id', sourceKey: 'id' });
InspectorClanMember.hasOne(InspectorClan, { as: 'clan', foreignKey: 'id', sourceKey: 'clan_id' });
InspectorClan.hasMany(InspectorClanMember, { as: 'clan_members', foreignKey: 'clan_id' });

module.exports.AltScore = AltScore;
module.exports.AltUser = AltUser;
module.exports.InspectorOsuUser = InspectorOsuUser;
module.exports.InspectorClan = InspectorClan;
module.exports.InspectorClanMember = InspectorClanMember;
module.exports.InspectorClanStats = InspectorClanStats;
module.exports.InspectorUserMilestone = InspectorUserMilestone;
module.exports.InspectorScoreStat = InspectorScoreStat;
module.exports.InspectorHistoricalScoreRankOsu = InspectorHistoricalScoreRankOsu;
module.exports.InspectorHistoricalScoreRankTaiko = InspectorHistoricalScoreRankTaiko;
module.exports.InspectorHistoricalScoreRankMania = InspectorHistoricalScoreRankMania;
module.exports.InspectorHistoricalScoreRankFruits = InspectorHistoricalScoreRankFruits;

module.exports.GetHistoricalScoreRankModel = (mode) => {
    switch (mode) {
        case 'osu':
            return InspectorHistoricalScoreRankOsu;
        case 'taiko':
            return InspectorHistoricalScoreRankTaiko;
        case 'mania':
            return InspectorHistoricalScoreRankMania;
        case 'fruits':
            return InspectorHistoricalScoreRankFruits;
        default:
            return null;
    }
}
