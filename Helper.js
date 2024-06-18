const { InspectorOsuUser, AltScore } = require("./db");

module.exports.UpdateUser = UpdateUser;
async function UpdateUser(user_id) {
    //check if user is a sequelize object or an id
    const user_obj = await InspectorOsuUser.findOne({ where: { user_id } });

    if (!user_obj) {
        return null;
    }

    const scores_B = await AltScore.count({ where: { user_id: user_id, rank: 'B' } });
    const scores_C = await AltScore.count({ where: { user_id: user_id, rank: 'C' } });
    const scores_D = await AltScore.count({ where: { user_id: user_id, rank: 'D' } });
    const total_pp = await AltScore.sum('pp', { where: { user_id: user_id } });

    //set b_count to either scores_B, keep b_count or 0
    user_obj.b_count = scores_B ?? user_obj.b_count ?? 0;
    user_obj.c_count = scores_C ?? user_obj.c_count ?? 0;
    user_obj.d_count = scores_D ?? user_obj.d_count ?? 0;
    user_obj.total_pp = total_pp ?? user_obj.total_pp ?? 0;

    //save
    await user_obj.save();

    return user_obj;
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