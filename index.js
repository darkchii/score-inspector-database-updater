//this script is to store some data in the local database, like overall score statistics.
//mainly to circumvent extremely slow sql queries that don't need to be live
const schedule = require('node-schedule');
const usersCacher = require("./Jobs/JobUsers.js");
const performanceDistributionCacher = require("./Jobs/JobPerformanceDistribution.js");
const scoreStatCacher = require("./Jobs/JobScoreStatistics.js");
const scoreRankCacher = require("./Jobs/JobScoreRank.js");
const populationStatsCacher = require("./Jobs/JobPopulation.js");
const systemStatsCacher = require("./Jobs/JobSystemStats.js");
const monthlyRankingsCacher = require("./Jobs/JobMonthlyRanking.js");
const teamCacher = require("./Jobs/JobTeams.js");
const activityCacher = require("./Jobs/JobGameActivity.js");
const { BulkProcessStars } = require('./Jobs/JobProcessModdedStarratings.js');
const { BulkProcessMissingLazerMods } = require('./Jobs/JobProcessMissingLazerMods.js');

require('dotenv').config();

function StartCacher() {
    Loop();
}
module.exports = StartCacher;

const Cachers = [
    //run every 4 hours, parallel to everything else so it doesn't interfere with the other jobs
    //(this is a very heavy job)
    //TEMP DISABLED { cacher: monthlyRankingsCacher, interval: '0 */4 * * *', data: [], parallel: true }, //every 4 hours
    //TEMP DISABLED { cacher: usersCacher, interval: '0 */1 * * *', data: [], onStart: true }, //every 1 hour
    //TEMP DISABLED { cacher: performanceDistributionCacher, interval: '0 */4 * * *', data: [] }, //every 4 hours
    //TEMP DISABLED { cacher: scoreStatCacher, interval: '0 * * * *', data: ['24h', '7d', 'all'] },
    //TEMP DISABLED { cacher: scoreStatCacher, interval: '*/30 * * * *', data: ['30min'] },
    //TEMP DISABLED { cacher: activityCacher, interval: '*/15 * * * *', data: [] }, //every 15 minutes
    //TEMP DISABLED { cacher: scoreRankCacher, interval: '1 0 * * *', data: 'osu' },
    //TEMP DISABLED { cacher: scoreRankCacher, interval: '1 0 * * *', data: 'taiko' },
    //TEMP DISABLED { cacher: scoreRankCacher, interval: '1 0 * * *', data: 'fruits' },
    //TEMP DISABLED { cacher: scoreRankCacher, interval: '1 0 * * *', data: 'mania' },
    //TEMP DISABLED { cacher: populationStatsCacher, interval: '0 */4 * * *', data: [] }, //every 4 hours
    //TEMP DISABLED { cacher: systemStatsCacher, interval: '*/30 * * * *', data: [], timeout: 20 }, //needs timeout, for some reason it keeps running forever on very rare occasions
]

//these just run again when finished, not relying on a schedule
//useful with slow jobs that are unpredictable in time
const ConstantCachers = [
    // { cacher: teamCacher, interval: '0 */1 * * *', data: [], wait: 60000 }
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
                console.warn(`[CACHER] Error running ${job.cacher.name}`);
                console.warn(e);
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

function ConstantLoop() {
    if(ConstantCachers.length === 0) return;
    //constantcachers dont need to store in jobqueue
    //just re-run the function when it's done, but always independent and async from each other
    for (const cacher of ConstantCachers) {
        (async () => {
            while (true) {
                try{
                    console.log(`[CACHER] Running ${cacher.cacher.name} ...`);
                    await cacher.cacher.func(cacher.data);
                    console.log(`[CACHER] Finished ${cacher.cacher.name}`);
                    //artificial delay to prevent spamming (like debug mode)
                }catch(e){
                    console.warn(`[CACHER] Error running ${cacher.cacher.name}`);
                    console.warn(e);
                    //artificial delay to prevent spamming (like debug mode)
                }
                await new Promise(r => setTimeout(r, cacher.wait || 1000));
            }
        })();
    }
}

async function ProcessStars() {
    while (true) {
        try {
            await BulkProcessStars();
        } catch (err) {
            console.warn(err);
            //sleep for 1 minute
            await new Promise(r => setTimeout(r, 6000));
        }
    }
}

async function ProcessMissingLazerMods() {
    while (true) {
        try {
            await BulkProcessMissingLazerMods();
        } catch (err) {
            console.warn(err);
            //sleep for 1 minute
            await new Promise(r => setTimeout(r, 60000));
        }
    }
}
if (process.env.NODE_ENV === 'production') {
    QueueProcessor();
    ConstantLoop()
    Loop();
    ProcessStars();
} else {
    console.log('Not in production mode, not starting cacher');
    //test
    // ProcessStars();
    // ConstantLoop()
}
// ProcessMissingLazerMods();
