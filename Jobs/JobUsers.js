const { Op, Sequelize } = require("sequelize");
const { InspectorOsuUser, AltUser, InspectorUserMilestone } = require("../db");
const { UpdateUser, ACHIEVEMENT_INTERVALS, BatchUpdateUserAltData } = require("../Helper");

const cacher = {
    func: UpdateUsers,
    name: 'UpdateUsers',
}

module.exports = cacher;

async function UpdateUsers() {
    const columns = Object.keys(InspectorOsuUser.rawAttributes);
    const exclude = [
        'b_count', 
        'c_count', 
        'd_count', 
        'total_pp', 
        'alt_ssh_count', 
        'alt_ss_count', 
        'alt_s_count', 
        'alt_sh_count', 
        'alt_a_count',
        'medals',
        'badges',
        'team_id'
    ];
    const exclude_remote = [
        'global_ss_rank',
        'country_ss_rank',
        'global_ss_rank_highest',
        'global_ss_rank_highest_date',
        'country_ss_rank_highest',
        'country_ss_rank_highest_date'
    ];
    const actual_columns = columns.filter(x => !exclude.includes(x));

    const remote_users = await AltUser.findAll({
        // attributes: actual_columns,
        //with exclude_remote aswell
        attributes: actual_columns.filter(x => !exclude_remote.includes(x)),
        raw: true
    });
    const local_users = await InspectorOsuUser.findAll({
        attributes: actual_columns,
        raw: true
    });

    // //check if any stat went over a threshold for achievement
    for await (const user of remote_users) {
        const local_user = local_users.find(x => x.user_id === user.user_id);
        if (!local_user) continue;

        for await (const achievement of ACHIEVEMENT_INTERVALS) {
            let old_stat = 0;
            let new_stat = 0;
            for await (const stat of achievement.stats) {
                old_stat += parseInt(local_user[stat]);
                new_stat += parseInt(user[stat]);
            }

            if (old_stat === -1 || new_stat === -1) continue;

            let interval = achievement.interval;

            if (achievement.intervalAlternative) {
                for await (const alt of achievement.intervalAlternative) {
                    if (alt.dir === '<' && new_stat < alt.check && interval > alt.interval) {
                        interval = alt.interval;
                    } else if (alt.dir === '>' && new_stat > alt.check && interval < alt.interval) {
                        interval = alt.interval;
                    }
                }
            }

            let normalized_old_stat = Math.floor(old_stat / interval);
            let normalized_new_stat = Math.floor(new_stat / interval);

            if (normalized_old_stat === normalized_new_stat) continue;
            if (achievement.dir === '>' && normalized_new_stat < normalized_old_stat) continue;
            if (achievement.dir === '<' && normalized_new_stat > normalized_old_stat) continue;

            const reached_milestone = achievement.dir === '>' ? normalized_new_stat : normalized_old_stat;

            await InspectorUserMilestone.create({
                user_id: user.user_id,
                achievement: achievement.name,
                count: reached_milestone * interval,
                time: new Date()
            });
            console.log(`[MILESTONE] ${user.username} reached ${reached_milestone * interval} (${achievement.name})`)
        }
    }

    console.log(`[CACHER] Calculating global SS ranks ...`);
    //get global ss rank
    //order remote_users by ss_count, then find the index of the user in the array
    remote_users.sort((a, b) => (b.ssh_count + b.ss_count) - (a.ssh_count + a.ss_count));
    for await (const [index, user] of remote_users.entries()) {
        user.global_ss_rank = index + 1;

        //check local user to see if we need to update the highest rank
        const local_user = local_users.find(x => x.user_id === user.user_id);
        if (!local_user) {
            console.log(`[CACHER] User ${user.username} not found in local database ...`);
            continue;
        }

        user.global_ss_rank_highest = local_user.global_ss_rank_highest || null;
        user.global_ss_rank_highest_date = local_user.global_ss_rank_highest_date || null;

        if (!local_user.global_ss_rank_highest || local_user.global_ss_rank_highest > user.global_ss_rank) {
            user.global_ss_rank_highest = user.global_ss_rank;
            user.global_ss_rank_highest_date = new Date();
        }
    }

    console.log(`[CACHER] Calculating country SS ranks ...`);

    //next, get all UNIQUE country codes from remote_users
    const country_codes = [...new Set(remote_users.map(x => x.country_code))];
    //for each country code, get all users with that country code, order them by ss_count, then find the index of the user in the array
    for await (const country_code of country_codes) {
        const users = remote_users.filter(x => x.country_code === country_code);
        users.sort((a, b) => (b.ssh_count + b.ss_count) - (a.ssh_count + a.ss_count));
        for await (const [index, user] of users.entries()) {
            user.country_ss_rank = index + 1;

            //check local user to see if we need to update the highest rank
            const local_user = local_users.find(x => x.user_id === user.user_id);
            if (!local_user) {
                console.log(`[CACHER] User ${user.username} not found in local database ...`);
                continue;
            }

            user.country_ss_rank_highest = local_user.country_ss_rank_highest || null;
            user.country_ss_rank_highest_date = local_user.country_ss_rank_highest_date || null;

            if (!local_user.country_ss_rank_highest || local_user.country_ss_rank_highest > user.country_ss_rank) {
                user.country_ss_rank_highest = user.country_ss_rank;
                user.country_ss_rank_highest_date = new Date();
            }
        }
        console.log(`[CACHER] Calculated country SS ranks for ${country_code} ...`);
    }

    console.log(`[CACHER] Inserting or updating users ...`);
    // //insert or update all users in InspectorOsuUser
    await InspectorOsuUser.bulkCreate(remote_users, {
        updateOnDuplicate: actual_columns
    });
    console.log(`[CACHER] Finished updating users ...`);
}

//seperate function to constantly update users (because it's a long process, and we don't care for it to happen at the same time as the other cachers)
const BATCH_FETCH = 250;
async function Loop() {
    let page = 0;
    while (true) {
        try {
            const users = await InspectorOsuUser.findAll({ limit: BATCH_FETCH, offset: page * BATCH_FETCH });
            if (users.length === 0) {
                console.log(`[CACHER] Finished updating all users ...`);
                page = 0;
                //wait 5 minutes before fetching again
                console.log(`[CACHER] Waiting 10 minute before fetching again ...`);
                await new Promise((resolve, reject) => { setTimeout(() => { resolve(); }, 10 * 60 * 1000); });
                continue;
            }
            await Promise.race([
                BatchUpdateUserAltData(users),
                new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error('User update took longer than 10 seconds, skipping to next user'));
                    }, 60 * 1000); //1 minute
                })
            ]);
            console.log(`[CACHER] Updated ${users.length} users ... done with page ${page} ... (total users: ${page * BATCH_FETCH + users.length})`)
            page++;
        } catch (err) {
            console.error(err);
            await new Promise((resolve, reject) => { setTimeout(() => { resolve(); }, 10 * 1000); });
        }
    }
}
if (process.env.NODE_ENV === 'production') {
    Loop();
}