const { Op } = require("sequelize");
const { InspectorScoreStat, AltScore, AltUser, AltPriorityUser, AltBeatmap, AltScoreMods } = require("../db");

const cacher = {
    func: UpdateSystemInfo,
    name: 'UpdateSystemInfo',
}

module.exports = cacher;

async function UpdateSystemInfo(){
    const score_count = await AltScore.count();
    const lazerified_score_count = await AltScoreMods.count(
        //where date_played equals date_attributes
        {
            where: {
                date_played: {
                    [Op.col]: 'date_attributes'
                }
            }
        }
    );
    const user_count = await AltUser.count();
    const priority_user_count = await AltPriorityUser.count();
    const beatmap_count = await AltBeatmap.count({
        //approved in 1,2,4 and mode 0
        where: {
            approved: {
                [Op.or]: [1, 2, 4]
            },
            mode: 0
        }
    });
    const modded_sr_recalc_count = await AltScoreMods.count({
        where: {
            recalc: true
        }
    });

    const exists = await InspectorScoreStat.findOne({
        where: {
            key: 'system_info',
            period: 'any'
        }
    });

    console.log(`Score count: ${score_count}`);
    console.log(`Lazerified score count: ${lazerified_score_count}`);
    console.log(`User count: ${user_count}`);
    console.log(`Priority user count: ${priority_user_count}`);
    console.log(`Beatmap count: ${beatmap_count}`);
    console.log(`Modded star rating recalc count: ${modded_sr_recalc_count}`);

    let values = {
        score_count,
        lazerified_score_count,
        user_count,
        priority_user_count,
        beatmap_count,
        modded_sr_recalc_count
    };

    if(exists){
        await InspectorScoreStat.update({
            value: JSON.stringify(values)
        }, {
            where: {
                key: 'system_info',
                period: 'any'
            }
        });
    } else {
        await InspectorScoreStat.create({
            key: 'system_info',
            period: 'any',
            value: JSON.stringify(values)
        });
    }
}
