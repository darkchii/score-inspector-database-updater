const { Sequelize } = require("sequelize");
const { ScoreModel } = require("./Models/ScoreModel");
const { InspectorUserMilestoneModel } = require("./Models/InspectorUserMilestoneModel");
const { OsuUserModel } = require("./Models/OsuUserModel");
const { AltUserModel } = require("./Models/AltUserModel");
const { InspectorScoreStatModel } = require("./Models/InspectorScoreStatModel");
const { InspectorHistoricalScoreRankModel } = require("./Models/InspectorHistoricalScoreRankMode");
const { InspectorCountryStatModel } = require("./Models/InspectorCountryStatModel");
const { AltPriorityUserModel } = require("./Models/AltPriorityUserModel");
const { AltUserAchievementModel } = require("./Models/AltUserAchievementModel");
const { AltUserBadgeModel } = require("./Models/AltUserBadgeModel");
const { AltBeatmapModel } = require("./Models/AltBeatmapModel");
const { InspectorClanRankingModel } = require("./Models/InspectorClanRankingModel");
const { AltScoreModsModel } = require("./Models/AltScoreModsModel");
const { OsuTeamModel } = require("./Models/OsuTeamModel");
const { OsuUserBaseModel } = require("./Models/OsuUserBaseModel");
const { InspectorUserModel } = require("./Models/InspectorUserModel");
const { OsuUserRulesetDataModel } = require("./Models/OsuUserRulesetDataModel");
const { OsuTeamRulesetModel } = require("./Models/OsuTeamRulesetMode");
require('dotenv').config();

let databases = {
    inspector: new Sequelize(
        process.env.MYSQL_DB,
        process.env.MYSQL_USER,
        process.env.MYSQL_PASS,
        {
            host: process.env.MYSQL_HOST,
            dialect: 'mariadb',
            timezone: 'Europe/Amsterdam',
            logging: false,
            retry: {
                max: 10, // maximum amount of retries
                backoffBase: 500, // 1 second
            }
        }),
    osuAlt: new Sequelize(
        process.env.ALT_DB_DATABASE,
        process.env.ALT_DB_USER,
        process.env.ALT_DB_PASSWORD,
        {
            host: process.env.ALT_DB_HOST,
            dialect: 'postgres',
            logging: false
        })
};

module.exports.Databases = databases;

const InspectorOsuUser = OsuUserModel(databases.inspector);
const InspectorTeam = OsuTeamModel(databases.inspector);
const InspectorTeamRuleset = OsuTeamRulesetModel(databases.inspector);
const InspectorUserMilestone = InspectorUserMilestoneModel(databases.inspector);
const InspectorScoreStat = InspectorScoreStatModel(databases.inspector);
const InspectorHistoricalScoreRankOsu = InspectorHistoricalScoreRankModel(databases.inspector, 'osu');
const InspectorHistoricalScoreRankTaiko = InspectorHistoricalScoreRankModel(databases.inspector, 'taiko');
const InspectorHistoricalScoreRankMania = InspectorHistoricalScoreRankModel(databases.inspector, 'mania');
const InspectorHistoricalScoreRankFruits = InspectorHistoricalScoreRankModel(databases.inspector, 'fruits');
const InspectorCountryStat = InspectorCountryStatModel(databases.inspector);

InspectorTeam.hasMany(InspectorTeamRuleset, { as: 'rulesets', foreignKey: 'id' });
InspectorTeamRuleset.belongsTo(InspectorTeam, { as: 'team', foreignKey: 'id' });

const AltScore = ScoreModel(databases.osuAlt);
const AltScoreMods = AltScoreModsModel(databases.osuAlt);
const AltUser = AltUserModel(databases.osuAlt);
const AltPriorityUser = AltPriorityUserModel(databases.osuAlt);
const AltUserAchievement = AltUserAchievementModel(databases.osuAlt);
const AltUserBadge = AltUserBadgeModel(databases.osuAlt);
const AltBeatmap = AltBeatmapModel(databases.osuAlt);

//InspectorOsuUser has team_id, InspectorTeam has id
InspectorOsuUser.hasOne(InspectorTeam, { as: 'team', foreignKey: 'id' });

AltUser.hasMany(AltScore, { as: 'scores', foreignKey: 'user_id' });
AltScore.belongsTo(AltUser, { as: 'user', foreignKey: 'user_id' });

AltBeatmap.hasMany(AltScore, { as: 'scores', foreignKey: 'beatmap_id' });
AltScore.belongsTo(AltBeatmap, { as: 'beatmap', foreignKey: 'beatmap_id' });

AltUser.hasMany(AltUserAchievement, { as: 'achievements', foreignKey: 'user_id' });
AltUserAchievement.belongsTo(AltUser, { as: 'user', foreignKey: 'user_id' });

AltUser.hasMany(AltUserBadge, { as: 'badges', foreignKey: 'user_id' });
AltUserBadge.belongsTo(AltUser, { as: 'user', foreignKey: 'user_id' });

AltScore.hasOne(AltScoreMods, { as: 'modern_mods', foreignKey: 'beatmap_id' });
AltScoreMods.belongsTo(AltScore, { as: 'modern_mods', foreignKey: 'beatmap_id' });

const InspectorUser = InspectorUserModel(databases.inspector);

const OsuUserBase = OsuUserBaseModel(databases.inspector);
const OsuUserRulesetData = OsuUserRulesetDataModel(databases.inspector);

module.exports.OsuUserBase = OsuUserBase;
module.exports.OsuUserRulesetData = OsuUserRulesetData;

module.exports.InspectorUser = InspectorUser;
module.exports.AltScore = AltScore;
module.exports.AltScoreMods = AltScoreMods;
module.exports.AltUser = AltUser;
module.exports.AltPriorityUser = AltPriorityUser;
module.exports.AltUserAchievement = AltUserAchievement;
module.exports.AltUserBadge = AltUserBadge;
module.exports.AltBeatmap = AltBeatmap;
module.exports.InspectorOsuUser = InspectorOsuUser;
module.exports.InspectorTeam = InspectorTeam;
module.exports.InspectorTeamRuleset = InspectorTeamRuleset;
module.exports.InspectorUserMilestone = InspectorUserMilestone;
module.exports.InspectorScoreStat = InspectorScoreStat;
module.exports.InspectorHistoricalScoreRankOsu = InspectorHistoricalScoreRankOsu;
module.exports.InspectorHistoricalScoreRankTaiko = InspectorHistoricalScoreRankTaiko;
module.exports.InspectorHistoricalScoreRankMania = InspectorHistoricalScoreRankMania;
module.exports.InspectorHistoricalScoreRankFruits = InspectorHistoricalScoreRankFruits;
module.exports.InspectorCountryStat = InspectorCountryStat;

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
