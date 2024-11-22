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
        'x-api-version': 20240130
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
        }
    }

    return users;
}

module.exports.GetDailyUser = GetDailyUser;
async function GetDailyUser(user_id, mode = 0, key = 'id', timeout = 1000) {
    try {
        const res = await axios.get(`https://osudaily.net/api/user.php?k=${process.env.OSUDAILY_API}&u=${user_id}&m=${mode}&min=0`, { timeout });
        return res.data;
    } catch (err) {
        return null;
    }
}

module.exports.GetCountryLeaderboard = GetCountryLeaderboard;
async function GetCountryLeaderboard() {
    try{
        const data = await InspectorCountryStat.findAll();

        //merge by country code
        let merged = [];
        data.forEach((row) => {
            let country = merged.find(c => c.country_code == row.country_code);
            if(country){
                country[row.stat] = row.value;
            }else{
                merged.push({
                    country_code: row.country_code,
                    [row.stat]: row.value
                });
            }
        });

        let regionNames = new Intl.DisplayNames(['en'], {type: 'region'});
        //add country name to each row
        merged.forEach((row) => {
            row.country = {
                code: row.country_code,
                name: regionNames.of(row.country_code)
            }

            row.ss_total_count = row.ssh_count + row.ss_count;
            row.s_total_count = row.sh_count + row.s_count;
            row.code = row.country_code;
        });

        return merged;
    }catch(err){
        return null;
    }
}
