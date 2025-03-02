const { Sequelize } = require('sequelize');
const { AltUser, AltScore, Raw, InspectorCountryStat } = require('./db');

require('dotenv').config();
const axios = require('axios').default;

let stored_token = null;
let refetch_token = null;

const OSU_CLIENT_ID = process.env.NODE_ENV === 'production' ? process.env.OSU_CLIENT_ID : process.env.OSU_CLIENT_ID_DEV;
const OSU_CLIENT_SECRET = process.env.NODE_ENV === 'production' ? process.env.OSU_CLIENT_SECRET : process.env.OSU_CLIENT_SECRET_DEV;

module.exports.OSU_CLIENT_ID = OSU_CLIENT_ID;
module.exports.OSU_CLIENT_SECRET = OSU_CLIENT_SECRET;

module.exports.MODE_SLUGS = ['osu', 'taiko', 'fruits', 'mania'];

async function Login(client_id, client_secret) {
    const data = {
        client_id,
        client_secret,
        grant_type: 'client_credentials',
        scope: 'public',
    };

    try {
        const res = await axios.post('https://osu.ppy.sh/oauth/token', data, {
            headers: {
                "Accept-Encoding": "gzip,deflate,compress"
            }
        });
        return res.data.access_token;
    } catch (err) {
        throw new Error('Unable to get osu!apiv2 token: ' + err.message);
    }
}

module.exports.AuthorizedApiCall = AuthorizedApiCall;
async function AuthorizedApiCall(url, type = 'get', api_version = null, timeout = 10000) {
    if (stored_token === null || refetch_token === null || refetch_token < Date.now()) {
        try {
            stored_token = await Login(OSU_CLIENT_ID, OSU_CLIENT_SECRET);
        } catch (err) {
            throw new Error('Unable to get osu!apiv2 token: ' + err.message);
        }
        refetch_token = Date.now() + 3600000;
    }

    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${stored_token}`,
        "Accept-Encoding": "gzip,deflate,compress", //axios fix (https://github.com/axios/axios/issues/5346)
        'x-api-version': 20240529
    };
    if (api_version != null) {
        headers['x-api-version'] = api_version;
    }

    let res;

    switch (type) {
        case 'get':
            res = await axios.get(url, {
                headers,
                timeout: parseInt(timeout)
            });
            break;
        case 'post':
            res = await axios.post(url, {
                headers,
                timeout: parseInt(timeout)
            });
            break;
    }

    return res;
}

module.exports.GetOsuUser = GetOsuUser;
async function GetOsuUser(username, mode = 'osu', key = 'username', timeout = 10000) {
    try {
        const res = await AuthorizedApiCall(`https://osu.ppy.sh/api/v2/users/${username}/${mode}?key=${key}`, 'get', null, timeout);
        return res.data;
    } catch (err) {
        throw new Error('Unable to get user: ' + err.message);
    }
}

module.exports.GetUserBeatmaps = GetUserBeatmaps;
async function GetUserBeatmaps(username, type = 'ranked', limit = 100, offset = 0, timeout = 10000) {
    const res = await AuthorizedApiCall(`https://osu.ppy.sh/api/v2/users/${username}/beatmapsets/${type}?limit=${limit}&offset=${offset}`, 'get', null, timeout);
    try {
        return res.data;
    } catch (err) {
        throw new Error('Unable to get user beatmaps: ' + err.message);
    }
}

module.exports.GetBeatmapScores = GetBeatmapScores;
async function GetBeatmapScores(beatmap_id, mode = 'osu', mods = null, timeout = 10000) {
    const res = await AuthorizedApiCall(`https://osu.ppy.sh/api/v2/beatmaps/${beatmap_id}/scores?mode=${mode}${mods ? `&mods=${mods}` : ''}`, 'get', null, timeout);
    try {
        return res.data;
    } catch (err) {
        throw new Error('Unable to get user beatmaps: ' + err.message);
    }
}

module.exports.GetUserBeatmapScores = GetUserBeatmapScores;
async function GetUserBeatmapScores(user_id, beatmap_id, mode = 'osu', mods = null, timeout = 10000) {
    const res = await AuthorizedApiCall(`https://osu.ppy.sh/api/v2/beatmaps/${beatmap_id}/scores/users/${user_id}/all?ruleset=${mode}`, 'get', null, timeout);
    try {
        return res.data;
    } catch (err) {
        throw new Error('Unable to get user beatmaps: ' + err.message);
    }
}

module.exports.GetOsuUsers = GetOsuUsers;
async function GetOsuUsers(id_array, timeout = 5000) {
    let users = [];
    let split_array = [];

    let cloned_ids = JSON.parse(JSON.stringify(id_array));
    //split array into chunks of 50
    while (cloned_ids.length > 0) {
        split_array.push(cloned_ids.splice(0, 50));
    }

    //get data from osu api
    for (let i = 0; i < split_array.length; i++) {
        try {
            const url = `https://osu.ppy.sh/api/v2/users?ids[]=${split_array[i].join('&ids[]=')}`;
            const res = await AuthorizedApiCall(url, 'get', null, timeout);
            let _users = JSON.parse(JSON.stringify(res.data))?.users;
            users = [...users, ..._users];
        } catch (err) {
            console.error('Unable to get osu users: ' + err.message);
        }
    }

    return users;
}

const XP_POINTS_DISTRIBUTION = {
    SS: 200,
    S: 100,
    A: 50,
    RANKED_SCORE_BILLION: 0.000008,
    TOTAL_SCORE_BILLION: 0.000004,
    MEDAL: 20000,
    PLAYTIME_HOUR: 300
}
module.exports.CalculateXP = function (total_ss, total_s, total_a, ranked_score, total_score, medals, playtime){
    let xp = 0;
    xp += total_ss * XP_POINTS_DISTRIBUTION.SS;
    xp += total_s * XP_POINTS_DISTRIBUTION.S;
    xp += total_a * XP_POINTS_DISTRIBUTION.A;
    xp += ranked_score * XP_POINTS_DISTRIBUTION.RANKED_SCORE_BILLION;
    xp += total_score * XP_POINTS_DISTRIBUTION.TOTAL_SCORE_BILLION;
    xp += medals * XP_POINTS_DISTRIBUTION.MEDAL;
    xp += (playtime / 3600) * XP_POINTS_DISTRIBUTION.PLAYTIME_HOUR;

    return xp;
}