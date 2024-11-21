//this script is to store some data in the local database, like overall score statistics.
//mainly to circumvent extremely slow sql queries that don't need to be live
const schedule = require('node-schedule');
const usersCacher = require("./Jobs/JobUsers.js");
const clansCacher = require("./Jobs/JobClans.js");
const performanceDistributionCacher = require("./Jobs/JobPerformanceDistribution.js");
const scoreStatCacher = require("./Jobs/JobScoreStatistics.js");
const scoreRankCacher = require("./Jobs/JobScoreRank.js");
const populationStatsCacher = require("./Jobs/JobPopulation.js");
const systemStatsCacher = require("./Jobs/JobSystemStats.js");
const clanRankingsCacher = require("./Jobs/JobClanRanking.js");
const monthlyRankingsCacher = require("./Jobs/JobMonthlyRanking.js");
const { BulkProcessStars } = require('./Jobs/JobProcessModdedStarratings.js');

require('dotenv').config();

function StartCacher() {
    Loop();
}
module.exports = StartCacher;

const Cachers = [
    //run every 4 hours, parallel to everything else so it doesn't interfere with the other jobs
    //(this is a very heavy job)
    { cacher: monthlyRankingsCacher, interval: '0 */4 * * *', data: [], parallel: true, onStart: true },
    { cacher: usersCacher, interval: '0 */1 * * *', data: [], onStart: true }, //every 1 hour
    { cacher: clansCacher, interval: '0 */1 * * *', data: [], onStart: true }, //every 1 hour
    { cacher: performanceDistributionCacher, interval: '0 */4 * * *', data: [], onStart: true }, //every 4 hours
    { cacher: scoreStatCacher, interval: '0 * * * *', data: ['24h', '7d', 'all'], onStart: true },
    { cacher: scoreStatCacher, interval: '*/30 * * * *', data: ['30min'], onStart: true },
    { cacher: scoreRankCacher, interval: '1 0 * * *', data: 'osu' },
    { cacher: scoreRankCacher, interval: '1 0 * * *', data: 'taiko' },
    { cacher: scoreRankCacher, interval: '1 0 * * *', data: 'fruits' },
    { cacher: scoreRankCacher, interval: '1 0 * * *', data: 'mania' },
    { cacher: populationStatsCacher, interval: '0 */4 * * *', data: [] }, //every 4 hours
    { cacher: systemStatsCacher, interval: '*/30 * * * *', data: [], timeout: 20 }, //needs timeout, for some reason it keeps running forever on very rare occasions
    //always run this at hh:59
    { cacher: clanRankingsCacher, interval: '59 * * * *', data: [] },
]

const jobQueue = [];

async function QueueProcessor() {
    while (true) {
        if (jobQueue.length > 0) {
            const job = jobQueue.shift();
            try {
                console.log(`[CACHER] Running ${job.cacher.name} ...`);
                if (job.timeout) {
                    await Promise.race([
                        job.cacher.func(job.data),
                        new Promise((resolve, reject) => {
                            setTimeout(() => {
                                reject(new Error('Function exceeded maximum run time'));
                            }, job.timeout * 60 * 1000);
                        })
                    ]);
                } else {
                    if (job.parallel) {
                        job.cacher.func(job.data);
                    } else {
                        await job.cacher.func(job.data);
                    }
                }
                console.log(`[CACHER] Finished ${job.cacher.name}`);
            } catch (e) {
                console.error(`[CACHER] Error running ${job.cacher.name}`);
                console.error(e);
            }
        }
        await new Promise(r => setTimeout(r, 1000));
    }
}

async function Loop() {
    for await (const cacher of Cachers) {
        if (cacher.onStart) {
            jobQueue.push(cacher);
        }
        schedule.scheduleJob(cacher.interval, () => {
            console.log(`[CACHER] Queuing ${cacher.cacher.name} ...`);
            jobQueue.push(cacher);
        });
        console.log(`[CACHER] Scheduled ${cacher.cacher.name} to run every ${cacher.interval}`);
    }
}

async function ContinuousFunc() {
    while(true){
        try{
            await BulkProcessStars();
        }catch(err){
            console.error(err);
            //sleep for 1 minute
            await new Promise(r => setTimeout(r, 60000));
        }
    }
}
if (process.env.NODE_ENV === 'production') {
    QueueProcessor();
    Loop();
    ContinuousFunc();
}
