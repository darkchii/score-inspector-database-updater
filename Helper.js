const { Op } = require("sequelize");
const { InspectorOsuUser, AltScore, InspectorClanMember, InspectorClanStats, AltUser } = require("./db");

module.exports.UpdateUser = UpdateUser;
async function UpdateUser(user_obj) {
    //check if user is a sequelize object or an id
    if (!user_obj) {
        return null;
    }

    const data = await AltScore.findOne({
        where: {
            user_id: user_obj.user_id
        },
        attributes: [
            [AltScore.sequelize.fn('SUM', AltScore.sequelize.col('pp')), 'total_pp'],
            [AltScore.sequelize.fn('COUNT', AltScore.sequelize.literal('CASE WHEN rank = \'XH\' THEN 1 END')), 'xh_count'],
            [AltScore.sequelize.fn('COUNT', AltScore.sequelize.literal('CASE WHEN rank = \'X\' THEN 1 END')), 'x_count'],
            [AltScore.sequelize.fn('COUNT', AltScore.sequelize.literal('CASE WHEN rank = \'SH\' THEN 1 END')), 'sh_count'],
            [AltScore.sequelize.fn('COUNT', AltScore.sequelize.literal('CASE WHEN rank = \'S\' THEN 1 END')), 's_count'],
            [AltScore.sequelize.fn('COUNT', AltScore.sequelize.literal('CASE WHEN rank = \'A\' THEN 1 END')), 'a_count'],
            [AltScore.sequelize.fn('COUNT', AltScore.sequelize.literal('CASE WHEN rank = \'B\' THEN 1 END')), 'b_count'],
            [AltScore.sequelize.fn('COUNT', AltScore.sequelize.literal('CASE WHEN rank = \'C\' THEN 1 END')), 'c_count'],
            [AltScore.sequelize.fn('COUNT', AltScore.sequelize.literal('CASE WHEN rank = \'D\' THEN 1 END')), 'd_count']
        ],
        group: ['user_id'],
        raw: true
    });

    const scores_XH = parseInt(data?.xh_count ?? 0);
    const scores_X = parseInt(data?.x_count ?? 0);
    const scores_SH = parseInt(data?.sh_count ?? 0);
    const scores_S = parseInt(data?.s_count ?? 0);
    const scores_A = parseInt(data?.a_count ?? 0);
    const scores_B = parseInt(data?.b_count ?? 0);
    const scores_C = parseInt(data?.c_count ?? 0);
    const scores_D = parseInt(data?.d_count ?? 0);
    const total_pp = parseFloat(data?.total_pp ?? 0);

    user_obj.b_count = scores_B ?? user_obj.b_count ?? 0;
    user_obj.c_count = scores_C ?? user_obj.c_count ?? 0;
    user_obj.d_count = scores_D ?? user_obj.d_count ?? 0;
    user_obj.total_pp = total_pp ?? user_obj.total_pp ?? 0;
    user_obj.alt_ssh_count = scores_XH ?? user_obj.alt_ssh_count ?? 0;
    user_obj.alt_ss_count = scores_X ?? user_obj.alt_ss_count ?? 0;
    user_obj.alt_s_count = scores_S ?? user_obj.alt_s_count ?? 0;
    user_obj.alt_sh_count = scores_SH ?? user_obj.alt_sh_count ?? 0;
    user_obj.alt_a_count = scores_A ?? user_obj.alt_a_count ?? 0;

    //save
    await user_obj.save();

    return user_obj;
}

module.exports.UpdateClan = UpdateClan;
async function UpdateClan(id) {
    const data = {
        total_ss: 0,
        total_ssh: 0,
        total_s: 0,
        total_sh: 0,
        total_a: 0,
        total_b: 0,
        total_c: 0,
        total_d: 0,
        playcount: 0,
        playtime: 0,
        ranked_score: 0,
        total_score: 0,
        replays_watched: 0,
        total_hits: 0,
        average_pp: 0,
        total_pp: 0,
        accuracy: 0,
        clears: 0
    };

    let temp_sum_pp = 0;
    let temp_sum_acc = 0;

    //get all members of the clan
    const members = await InspectorClanMember.findAll({
        where: {
            clan_id: id,
            pending: false
        }
    });

    if (members.length === 0) {
        console.log(`Clan ${id} has no members`);
        return;
    }

    let ids = members.map(m => m.osu_id);
    //remove undefined ids
    ids = ids.filter(x => x);


    //we use alt user because we want to get the stats of the user in the clan
    //alt is also more up to date with restrictions
    const local_users = await AltUser.findAll({
        where: {
            user_id: ids
        }
    });

    local_users.forEach(u => {
        data.total_ss += u.ss_count;
        data.total_ssh += u.ssh_count;
        data.total_s += u.s_count;
        data.total_sh += u.sh_count;
        data.total_a += u.a_count;
        data.total_b += (u.b_count ?? 0);
        data.total_c += (u.c_count ?? 0);
        data.total_d += (u.d_count ?? 0);
        data.total_pp += (u.total_pp ?? 0);
        data.playcount += u.playcount;
        data.playtime += u.playtime;
        data.ranked_score += u.ranked_score;
        data.total_score += u.total_score;
        data.replays_watched += u.replays_watched;
        data.total_hits += u.total_hits;
        data.clears += u.ss_count + u.s_count + u.sh_count + u.ssh_count + u.a_count + (u.b_count ?? 0) + (u.c_count ?? 0) + (u.d_count ?? 0);
        temp_sum_pp += u.pp;
        temp_sum_acc += u.hit_accuracy ?? 0;
    });

    data.accuracy = temp_sum_acc / local_users.length;
    if (data.accuracy === NaN || data.accuracy === Infinity || data.accuracy === -Infinity || data.accuracy === undefined || data.accuracy === null || data.accuracy === NaN || data.accuracy === 0
        || isNaN(data.accuracy) || data.accuracy === "NaN" || data.accuracy === "Infinity" || data.accuracy === "-Infinity" || data.accuracy === "undefined" || data.accuracy === "null" || data.accuracy === "NaN" || data.accuracy === "0"
    ) {
        data.accuracy = 0;
    }

    local_users.sort((a, b) => b.pp - a.pp);
    let total_pp = 0;
    const weight = 0.5;

    local_users.forEach((u, index) => {
        const _weight = Math.pow(weight, index);
        total_pp += u.pp * _weight;
    });

    data.average_pp = total_pp;

    let stats = await InspectorClanStats.findOne({
        where: {
            clan_id: id
        }
    });

    for (const key in data) {
        stats.set(key, data[key]);
    }

    console.log(`Checked clan ${id}`);

    await stats.save();
}

const db_now = "timezone('utc', now())";
module.exports.db_now = db_now;

const beatmap_columns = `
    beatmaps.approved, 
    beatmaps.submit_date, 
    beatmaps.approved_date, 
    beatmaps.last_update,
    beatmaps.artist,
    beatmaps.set_id,
    beatmaps.bpm,
    beatmaps.creator,
    beatmaps.creator_id,
    beatmaps.stars,
    beatmaps.diff_aim,
    beatmaps.diff_speed,
    beatmaps.cs,
    beatmaps.od,
    beatmaps.ar,
    beatmaps.hp,
    beatmaps.drain,
    beatmaps.source,
    beatmaps.genre,
    beatmaps.language,
    beatmaps.title,
    beatmaps.length,
    beatmaps.diffname,
    beatmaps.file_md5,
    beatmaps.mode,
    beatmaps.tags,
    beatmaps.favorites,
    beatmaps.rating,
    beatmaps.playcount,
    beatmaps.passcount,
    beatmaps.maxcombo,
    beatmaps.circles,
    beatmaps.sliders,
    beatmaps.spinners,
    beatmaps.storyboard,
    beatmaps.video,
    beatmaps.download_unavailable,
    beatmaps.audio_unavailable,
    beatmaps.beatmap_id
`;

const score_columns = `
    scores.user_id, 
    scores.beatmap_id, 
    scores.score, 
    scores.count300, 
    scores.count100, 
    scores.count50, 
    scores.countmiss, 
    scores.combo, 
    scores.perfect, 
    scores.enabled_mods, 
    scores.date_played, 
    scores.rank, 
    scores.pp, 
    scores.accuracy, 
    ${beatmap_columns},
    moddedsr.star_rating,
    moddedsr.aim_diff,
    moddedsr.speed_diff,
    moddedsr.fl_diff,
    moddedsr.slider_factor,
    moddedsr.speed_note_count,
    moddedsr.modded_od,
    moddedsr.modded_ar,
    moddedsr.modded_cs,
    moddedsr.modded_hp
`;

const score_columns_full = `
    scores.user_id, 
    scores.beatmap_id, 
    scores.score, 
    scores.count300, 
    scores.count100, 
    scores.count50, 
    scores.countmiss, 
    scores.combo, 
    scores.perfect, 
    scores.enabled_mods, 
    scores.date_played, 
    scores.rank, 
    scores.pp, 
    scores.accuracy, 
    ${beatmap_columns},
    moddedsr.star_rating,
    moddedsr.aim_diff,
    moddedsr.speed_diff,
    moddedsr.fl_diff,
    moddedsr.slider_factor,
    moddedsr.speed_note_count,
    moddedsr.modded_od,
    moddedsr.modded_ar,
    moddedsr.modded_cs,
    moddedsr.modded_hp,
    pack_id
    `;
module.exports.score_columns = score_columns;
module.exports.beatmap_columns = beatmap_columns;
module.exports.score_columns_full = score_columns_full;

module.exports.sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.ACHIEVEMENT_INTERVALS = [
    {
        name: 'Total SS',
        stats: ['ssh_count', 'ss_count'], //sum
        dir: '>',
        interval: 1000 //every 1000 ss is an achievement
    },
    {
        name: 'Total S',
        stats: ['sh_count', 's_count'],
        dir: '>',
        interval: 1000
    }, {
        name: 'Silver SS',
        stats: ['ssh_count'],
        dir: '>',
        interval: 1000
    }, {
        name: 'Silver S',
        stats: ['sh_count'],
        dir: '>',
        interval: 1000
    }, {
        name: 'Gold SS',
        stats: ['ss_count'],
        dir: '>',
        interval: 1000
    }, {
        name: 'Gold S',
        stats: ['s_count'],
        dir: '>',
        interval: 1000
    }, {
        name: 'A',
        stats: ['a_count'],
        dir: '>',
        interval: 1000
    }, {
        name: 'Clears',
        stats: ['ssh_count', 'ss_count', 'sh_count', 's_count', 'a_count'],
        dir: '>',
        interval: 1000
    }, {
        name: 'Ranked Score',
        stats: ['ranked_score'],
        dir: '>',
        interval: 10000000000
    }, {
        name: 'Total Score',
        stats: ['total_score'],
        dir: '>',
        interval: 10000000000
    }, {
        name: 'PP',
        stats: ['pp'],
        dir: '>',
        interval: 1000
    }, {
        name: 'Playtime',
        stats: ['playtime'],
        dir: '>',
        interval: 360000 //every 100 hours is a milestone
    }, {
        name: 'Playcount',
        stats: ['playcount'],
        dir: '>',
        interval: 10000
    }, {
        name: 'Level',
        stats: ['level'],
        dir: '>',
        interval: 1
    }, {
        name: 'Global Rank',
        stats: ['global_rank'],
        dir: '<',
        interval: 100000, //every 100000 ranks is a milestone
        intervalAlternative: [
            {
                dir: '<',
                check: 200000,
                interval: 10000 //if rank under 200000, every 10000 ranks is a milestone
            },
            {
                dir: '<',
                check: 10000,
                interval: 1000 //if rank under 10000, every 1000 ranks is a milestone
            },
            {
                dir: '<',
                check: 1000,
                interval: 100 //if rank under 1000, every 100 ranks is a milestone
            },
            {
                dir: '<',
                check: 100,
                interval: 10 //if rank under 100, every 10 ranks is a milestone
            }
        ]
    }
]