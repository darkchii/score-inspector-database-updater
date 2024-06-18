const { default: axios } = require("axios");
const { InspectorHistoricalScoreRank, GetHistoricalScoreRankModel } = require("../db");
const { sleep } = require("../Helper");
const moment = require("moment");
const axiosRetry = require('axios-retry').default;

const cacher = {
    func: UpdateScoreRanks,
    name: 'UpdateScoreRanks',
}

module.exports = cacher;

const SCORE_RANK_PAGES = 200;
async function UpdateScoreRanks(mode = 'osu') {
    console.log(`[SCORE RANKS] Updating score ranks (${mode}) ...`);
    const FULL_LIST = [];

    // const YESTERDAY = new Date();
    // YESTERDAY.setDate(YESTERDAY.getDate() - 1);
    // YESTERDAY.setHours(0, 0, 0, 0);
    //use moment
    const YESTERDAY = moment().subtract(1, 'days').format('YYYY-MM-DD');
    
    //get a day before yesterday 00:00:00
    const DAY_BEFORE_YESTERDAY = moment().subtract(2, 'days').format('YYYY-MM-DD');
    
    //check if CURRENT_TIME is already in database
    const exists = await (GetHistoricalScoreRankModel(mode)).findOne({
        where: {
            date: YESTERDAY
        }
    });

    if (exists) {
        console.log(`[SCORE RANKS] ${YESTERDAY} already exists in database`);
        return;
    }

    let RETRIES = 0;
    let CURRENT_PAGE = 1;

    while (CURRENT_PAGE <= SCORE_RANK_PAGES) {
        console.log(`[SCORE RANKS] Fetching page ${CURRENT_PAGE} ...`);
        // const data = await axios.get(`https://score.respektive.pw/rankings/?page=${CURRENT_PAGE}`);
        const client = axios.create({
            baseURL: 'https://score.respektive.pw',
            timeout: 2500
        });
        axiosRetry(client, { retries: 3 });


        let _data = null;
        try {
            const data = await client.get(`/rankings/?page=${CURRENT_PAGE}&mode=${mode}`);
            _data = Object.values(data?.data);
        } catch (e) {
            console.log(`[SCORE RANKS] Failed to fetch page ${CURRENT_PAGE}, retrying ...`);
            await sleep(1000);
            RETRIES++;
            continue;
        }

        if (!_data || !_data.length || _data.length === 0) {
            if (RETRIES >= 3) {
                console.log(`[SCORE RANKS] Failed to fetch page ${CURRENT_PAGE} 3 times, skipping ...`);
                CURRENT_PAGE++;
                RETRIES = 0;
                continue;
            }

            console.log(`[SCORE RANKS] Failed to fetch page ${CURRENT_PAGE}, retrying ...`);
            await sleep(1000);
            RETRIES++;
            continue;
        }

        //add objects of lb to FULL_LIST
        for await (const row of _data) {
            FULL_LIST.push(row);
        }

        RETRIES = 0;
        CURRENT_PAGE++;
    }

    console.log(`[SCORE RANKS] Fetched ${FULL_LIST.length} score rank pairs.`);
    console.log(`[SCORE RANKS] Updating database ...`);

    let FIXED_ARR = [];
    //current time but 1 day ago

    //get entire set from day before
    const DAY_BEFORE_SET = await (GetHistoricalScoreRankModel(mode)).findAll({
        where: {
            //convert to YYYY-MM-DD format, omitting time
            date: DAY_BEFORE_YESTERDAY
        }
    });

    //get current day in DD/MM/YYYY format
    for await (const row of FULL_LIST) {
        //get user from day before
        const user = DAY_BEFORE_SET?.find(x => x.osu_id === row.user_id);

        const obj = {
            osu_id: row.user_id,
            username: row.username,
            rank: row.rank,
            old_rank: user ? user.rank : null,
            ranked_score: row.score,
            old_ranked_score: user ? user.ranked_score : null,
            date: YESTERDAY
        }
        FIXED_ARR.push(obj);
    }
    if (FIXED_ARR.length !== 10000) return;

    await GetHistoricalScoreRankModel(mode).bulkCreate(FIXED_ARR);

    console.log(`[SCORE RANKS] Updated database.`);
}
UpdateScoreRanks();
