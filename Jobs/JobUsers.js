const { Op } = require("sequelize");
const { InspectorOsuUser, AltUser, InspectorUserMilestone } = require("../db");
const { UpdateUser, ACHIEVEMENT_INTERVALS } = require("../Helper");

const cacher = {
    func: UpdateUsers,
    name: 'UpdateUsers',
}

module.exports = cacher;

async function UpdateUsers() {
    const columns = Object.keys(InspectorOsuUser.rawAttributes);
    const exclude = ['b_count', 'c_count', 'd_count', 'total_pp']
    const actual_columns = columns.filter(x => !exclude.includes(x));

    const remote_users = await AltUser.findAll({
        attributes: actual_columns,
        raw: true
    });
    const local_users = await InspectorOsuUser.findAll({
        attributes: actual_columns,
        raw: true
    });

    //check if any stat went over a threshold for achievement
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

    // //insert or update all users in InspectorOsuUser
    await InspectorOsuUser.bulkCreate(remote_users, {
        updateOnDuplicate: actual_columns
    });
}

//seperate function to constantly update users (because it's a long process, and we don't care for it to happen at the same time as the other cachers)
async function Loop() {
    (async () => {
        while (true) {
            try {
                const users = await InspectorOsuUser.findAll({
                    where: {
                        playtime: { [Op.gt]: 0, },
                        pp: { [Op.gt]: 0, },
                        global_rank: { [Op.gt]: 0, },
                        playcount: { [Op.gt]: 0, },
                    },
                    //randomize the order so we don't always update the same users first (like when the server restarts)
                    order: [
                        [InspectorOsuUser.sequelize.fn('RAND')],
                    ],
                });
                console.log(`[CACHER] Found ${users.length} users ...`);

                //show how many hours it will likely take to update all users (750ms per user)
                console.log(`[CACHER] Estimated time to update all users: ${users.length * 0.75 / 60 / 60} hours ...`);

                for await (const user of users) {
                    await UpdateUser(user.user_id);
                }

                console.log(`[CACHER] Updated ${users.length} users ...`);
            } catch (err) {
                console.error(err);
            }

            await new Promise(r => setTimeout(r, 1000 * 60 * 60)); //every 1 hour
        }
    })();
}
if (process.env.NODE_ENV === 'production') {
    Loop();
}