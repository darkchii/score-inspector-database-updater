//Improved user updater, uses new tables, and all rulesets
//Does NOT use osualt data, the old updater will keep using that

const { Op } = require("sequelize");
const { InspectorOsuUser, InspectorUser, Databases, OsuUserBase, AltUser, OsuUserRulesetData, InspectorTeam } = require("../db");
const { GetOsuUsers, GetOsuUser } = require("../Osu");

const cacher = {
    func: UpdateUsers,
    name: 'UpdateUsers',
}

module.exports = cacher;

const modes = ['osu', 'taiko', 'fruits', 'mania'];

async function UpdateUsers() {
    await InsertMissingInspectorUsers();
    await InsertMissingAltUsers();

    const users = await FindUsersWithoutOrOldestData();
    console.log(`Found ${users.length} users without data`);

    //Test: 1 user
    // console.log(10153735);
    // const OsuData = await GetOsuUser(5795337, 'taiko', 'id');
    // console.log(JSON.stringify(OsuData));

    let user_data = [];
    try {
        const _users = await GetOsuUsers(users);
        for await (const user of _users) {
            //get mode data
            //use promise.all to get all modes at once
            let [data_osu, data_taiko, data_fruits, data_mania] = await Promise.all(modes.map(mode => GetOsuUser(user.id, mode, 'id')));

            if (data_osu === null) {
                console.error(`Failed to get data for ${user.id} - ${user.username}, skipping`);
                continue;
            }

            console.log(`Got data for ${user.id} - ${user.username}`);
            //update user data

            user_data.push({
                base: user,
                osu: data_osu,
                taiko: data_taiko,
                fruits: data_fruits,
                mania: data_mania
            });
        }

        console.log(`Got data for ${user_data.length} users`);
    } catch (err) {
        console.error(err);
    }

    try {
        //Update all users at once
        await Promise.all(user_data.map(async user => { UpdateUser(user); }));

        //Update all teams in sequence (high chance of race conditions)
        for await(const user of user_data){
            if(user.base.team){
                await UpdateTeam(user.base.team);
            }
        }
    } catch (err) {
        console.log(err);
    }

    //wait for 2 seconds
    await new Promise(r => setTimeout(r, 2000));
}

async function UpdateUser(data_set) {
    //Run all parallel
    //update osuuserbase
    //update osuuserrulesetdata (id, ruleset pair) (for all `modes`)

    const osu_base_query = {
        is_active: data_set.base.is_active,
        is_bot: data_set.base.is_bot,
        is_deleted: data_set.base.is_deleted,
        is_online: data_set.base.is_online,
        is_supporter: data_set.base.is_supporter,
        pm_friends_only: data_set.base.pm_friends_only,
        username: data_set.base.username,
        country_code: data_set.base.country.code,
        country_name: data_set.base.country.name,
        profile_colour: data_set.base.profile_colour,
        default_group: data_set.base.default_group,
        kudosu_available: data_set.osu.kudosu?.available ?? 0,
        kudosu_total: data_set.osu.kudosu?.total ?? 0,
        join_date: data_set.osu.join_date, //for some reason, this is not in the base user data
        last_visit: data_set.base.last_visit,
        avatar_url: data_set.base.avatar_url,
        cover_custom_url: data_set.base.cover.custom_url,
        cover_url: data_set.base.cover.url,
        cover_id: data_set.base.cover.id,
        team_id: data_set.base.team?.id ?? null,
        ranked_and_approved_beatmapset_count: data_set.base.ranked_and_approved_beatmapset_count,
        unranked_beatmapset_count: data_set.base.unranked_beatmapset_count,
        follower_count: data_set.base.follower_count,
        mapping_follower_count: data_set.base.mapping_follower_count,
        favourite_beatmapset_count: data_set.base.favourite_beatmapset_count,
        graveyard_beatmapset_count: data_set.base.graveyard_beatmapset_count,
        guest_beatmapset_count: data_set.base.guest_beatmapset_count,
        loved_beatmapset_count: data_set.base.loved_beatmapset_count,
        comments_count: data_set.base.comments_count,
        beatmap_playcounts_count: data_set.base.beatmap_playcounts_count,
        nominated_beatmapset_count: data_set.base.nominated_beatmapset_count,
        pending_beatmapset_count: data_set.base.pending_beatmapset_count,
        post_count: data_set.base.post_count,
        support_level: data_set.base.support_level,
        daily_challenge_streak_best: data_set.osu.daily_challenge_user_stats.daily_streak_best,
        daily_challenge_streak_current: data_set.osu.daily_challenge_user_stats.daily_streak_current,
        daily_challenge_last_update: data_set.osu.daily_challenge_user_stats.last_update,
        daily_challenge_last_weekly_streak: data_set.osu.daily_challenge_user_stats.last_weekly_streak,
        daily_challenge_playcount: data_set.osu.daily_challenge_user_stats.playcount,
        daily_challenge_top_10p_placements: data_set.osu.daily_challenge_user_stats.top_10p_placements,
        daily_challenge_top_50p_placements: data_set.osu.daily_challenge_user_stats.top_50p_placements,
        daily_challenge_weekly_streak_best: data_set.osu.daily_challenge_user_stats.weekly_streak_best,
        daily_challenge_weekly_streak_current: data_set.osu.daily_challenge_user_stats.weekly_streak_current,
        achievements: data_set.osu.achievements?.length ?? 0,
        badges: data_set.osu.badges?.length ?? 0,
        last_updated: new Date()
    }

    const osu_base_mode_queries = modes.map(mode => {
        return {
            id: data_set.base.id,
            ruleset: mode,
            count_300: data_set[mode].statistics.count_300,
            count_100: data_set[mode].statistics.count_100,
            count_50: data_set[mode].statistics.count_50,
            count_miss: data_set[mode].statistics.count_miss,
            level: data_set[mode].statistics.level.current + data_set[mode].statistics.level.progress,
            global_rank: data_set[mode].statistics.global_rank,
            pp: data_set[mode].statistics.pp,
            ranked_score: data_set[mode].statistics.ranked_score,
            hit_accuracy: data_set[mode].statistics.hit_accuracy,
            play_count: data_set[mode].statistics.play_count,
            play_time: data_set[mode].statistics.play_time,
            total_score: data_set[mode].statistics.total_score,
            total_hits: data_set[mode].statistics.total_hits,
            maximum_combo: data_set[mode].statistics.maximum_combo,
            replays_watched_by_others: data_set[mode].statistics.replays_watched_by_others,
            is_ranked: data_set[mode].statistics.is_ranked,
            grade_count_ss: data_set[mode].statistics.grade_counts.ss,
            grade_count_ssh: data_set[mode].statistics.grade_counts.ssh,
            grade_count_s: data_set[mode].statistics.grade_counts.s,
            grade_count_sh: data_set[mode].statistics.grade_counts.sh,
            grade_count_a: data_set[mode].statistics.grade_counts.a,
            country_rank: data_set[mode].statistics.country_rank,
            last_updated: new Date()
        }
    });

    //findOrCreate for rulesets with empty data
    for await (const mode of modes) {
        await OsuUserRulesetData.findOrCreate({ where: { id: data_set.base.id, ruleset: mode } });
    }

    await Promise.all([
        OsuUserBase.update(osu_base_query, { where: { id: data_set.base.id } }),
        ...osu_base_mode_queries.map(query => OsuUserRulesetData.update(query, { where: { id: data_set.base.id, ruleset: query.ruleset } })),
    ]);

    console.log(`Updated user ${data_set.base.id} - ${data_set.base.username}`);
}

async function UpdateTeam(team){
    const team_data = await InspectorTeam.findOne({ where: { id: team.id }, raw: true });

    if(team_data === null){
        await InspectorTeam.create(team);
    }else{
        await InspectorTeam.update(team, { where: { id: team.id } });
    }
}

async function FindUsersWithoutOrOldestData(limit = 100) {
    //if last_updated is null, or username is null
    const osu_users = await OsuUserBase.findAll({
        attributes: ['id', 'username'],
        where: {
            [Op.or]: [
                { last_updated: null },
                { username: null }
            ]
        },
        limit: limit,
        raw: true
    });

    let osu_user_ids = osu_users.map(x => x.id);

    if (osu_user_ids.length === 0) {
        //Find by oldest last_updated
        const oldest_users = await OsuUserBase.findAll({
            attributes: ['id'],
            order: [
                ['last_updated', 'ASC']
            ],
            limit: limit,
            raw: true
        });

        osu_user_ids = oldest_users.map(x => x.id);
    }

    return osu_user_ids;
}

async function InsertMissingInspectorUsers() {
    //Get all user_ids of users that logged in on inspector, but are not in the new users table
    const inspector_users = await InspectorUser.findAll({ attributes: ['osu_id'], raw: true });
    const inspector_user_ids = inspector_users.map(x => x.osu_id);

    const osu_users = await OsuUserBase.findAll({ attributes: ['id'], where: { id: inspector_user_ids }, raw: true });
    const osu_user_ids = osu_users.map(x => x.id);

    const missing_users = inspector_user_ids.filter(x => !osu_user_ids.includes(x));

    //just insert the ids only, missing data will always be prioritized
    await OsuUserBase.bulkCreate(missing_users.map(x => ({ id: x })));
}

async function InsertMissingAltUsers() {
    const alt_users = await AltUser.findAll({ attributes: ['user_id'], raw: true });
    const alt_user_ids = alt_users.map(x => x.user_id);

    const osu_users = await OsuUserBase.findAll({ attributes: ['id'], where: { id: alt_user_ids }, raw: true });
    const osu_user_ids = osu_users.map(x => x.id);

    const missing_users = alt_user_ids.filter(x => !osu_user_ids.includes(x));

    //just insert the ids only, missing data will always be prioritized
    await OsuUserBase.bulkCreate(missing_users.map(x => ({ id: x })));
}

async function Loop() {
    while (true) {
        try {
            await UpdateUsers();
        } catch (err) {
            console.error(err);
            await new Promise((resolve, reject) => { setTimeout(() => { resolve(); }, 10 * 1000); }); //wait 10 seconds before trying again
            continue;
        }
    }
}
if (process.env.NODE_ENV === 'production') {
    Loop();
}