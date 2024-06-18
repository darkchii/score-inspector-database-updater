//this script is to store some data in the local database, like overall score statistics.
//mainly to circumvent extremely slow sql queries that don't need to be live
const schedule = require('node-schedule');
const usersCacher = require("./Jobs/JobUsers.js");
require('dotenv').config();

function StartCacher() {
    Loop();
}
module.exports = StartCacher;

const Cachers = [
    { cacher: usersCacher, interval: '0 */1 * * *', data: [], onStart: true, runParallel: true }, //every 1 hour
]

const jobQueue = [];

async function QueueProcessor() {
    while (true) {
        if (jobQueue.length > 0) {
            const job = jobQueue.shift();
            try {
                console.log(`[CACHER] Running ${job.cacher.name} ...`);
                if (job.cacher.runParallel) {
                    job.cacher.func(job.data);
                } else {
                    await job.cacher.func(job.data);
                }
            } catch (e) {
                // handle error
            }
        }
        await new Promise(r => setTimeout(r, 1000));
    }
}
QueueProcessor();

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
if (process.env.NODE_ENV === 'production') {
    Loop();
}
