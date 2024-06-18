const { Sequelize } = require("sequelize");
const { ScoreModel } = require("./Models/ScoreModel");
const { InspectorUserMilestoneModel } = require("./Models/InspectorUserMilestoneModel");
const { OsuUserModel } = require("./Models/OsuUserModel");
const { AltUserModel } = require("./Models/AltUserModel");
require('dotenv').config();

let databases = {
    inspector: new Sequelize(process.env.MYSQL_DB, process.env.MYSQL_USER, process.env.MYSQL_PASS, { host: process.env.MYSQL_HOST, dialect: 'mariadb', timezone: 'Europe/Amsterdam', logging: false }),
    osuAlt: new Sequelize(process.env.ALT_DB_DATABASE, process.env.ALT_DB_USER, process.env.ALT_DB_PASSWORD, { host: process.env.ALT_DB_HOST, dialect: 'postgres', logging: false })
};
module.exports.Databases = databases;

const InspectorOsuUser = OsuUserModel(databases.inspector);
const InspectorUserMilestone = InspectorUserMilestoneModel(databases.inspector);

const AltScore = ScoreModel(databases.osuAlt);
const AltUser = AltUserModel(databases.osuAlt);

module.exports.AltScore = AltScore;
module.exports.AltUser = AltUser;
module.exports.InspectorOsuUser = InspectorOsuUser;
module.exports.InspectorUserMilestone = InspectorUserMilestone;
