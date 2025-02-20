const { Databases, AltScore, AltScoreMods } = require("../db");
const { GetUserBeatmapScores } = require("../Osu");

let offset = 0;
async function BulkProcessMissingLazerMods(amount = 5){
    //select scores that arent in scoresmods table, or where scores.date_played doesnt match scoresmods.date_attributes
    //check by user_id, beatmap_id
    const columns = `
        s.user_id,
        s.beatmap_id,
        s.date_played,
        s.enabled_mods,
        sm.user_id as sm_user_id,
        sm.beatmap_id as sm_beatmap_id,
        sm.date_played as sm_date_played,
        sm.mods as sm_mods
    `
    const query = `
        SELECT 
            ${columns}
        FROM scores s
        INNER JOIN beatmaps b
        ON s.beatmap_id = b.beatmap_id
        INNER JOIN users2 u
        ON s.user_id = u.user_id
        LEFT JOIN scoresmods sm
        ON s.user_id = sm.user_id
        AND s.beatmap_id = sm.beatmap_id
        WHERE (sm.user_id IS NULL
        OR s.date_played != sm.date_played)
        AND s.date_played < NOW() - INTERVAL '2 hours'
        LIMIT ${amount}
    `;

    console.log(`[BULK PROCESS MISSING LAZER MODS] Fetching scores ...`);
    console.time(`[BULK PROCESS MISSING LAZER MODS] Fetched scores`);
    const scores = await Databases.osuAlt.query(query);
    console.timeEnd(`[BULK PROCESS MISSING LAZER MODS] Fetched scores`);
    
    if(scores[0].length > 0){
        let remote_scores = {};
        for await(const score of scores[0]){
            const remote_score = await GetUserBeatmapScores(score.user_id, score.beatmap_id);
            console.log(`[BULK PROCESS MISSING LAZER MODS] Fetched remote scores for user ${score.user_id} on beatmap ${score.beatmap_id}`);
            // remote_scores.push(remote_score);
            remote_scores[`${score.user_id}_${score.beatmap_id}`] = remote_score;
        }

        if(Object.keys(remote_scores).length>0){
            console.log(remote_scores[Object.keys(remote_scores)[0]]);
            await new Promise(r => setTimeout(r, 1000000));
        }

        for await(const score of scores[0]){
            const remote_score = remote_scores[`${score.user_id}_${score.beatmap_id}`];
            let picked_score = null;
            for await(const s of remote_score.scores){
                const _utc_date_played_remote = new Date(s.ended_at);
                //convert score.date_played to T-Z
                //score.date_played needs to have offset added
                const date_played_local_adjusted = new Date(score.date_played);
                const offset = -(date_played_local_adjusted.getTimezoneOffset());
                date_played_local_adjusted.setMinutes(date_played_local_adjusted.getMinutes() + offset);

                const remote_time = _utc_date_played_remote.getTime();
                const local_time = date_played_local_adjusted.getTime();
                //Check if they are the same utc date
                // if(s.date === score.date_played){
                if(remote_time === local_time){
                    picked_score = s;
                    break;
                }
            }
            
            if(picked_score === null){
                console.log(`[BULK PROCESS MISSING LAZER MODS] Unable to find score for user ${score.user_id} on beatmap ${score.beatmap_id}`);
                offset++;
                continue;
            }

            try{
                // await AltScoreMods.create({
                //     user_id: score.user_id,
                //     beatmap_id: score.beatmap_id,
                //     mods: picked_score.mods,
                //     date_played: picked_score.ended_at
                // });

                //o
                const _remote_score = picked_score;
                const _local_score = score;
                //insert or update
                
                const [instance, created] = await AltScoreMods.findOrCreate({
                    where: {
                        user_id: _local_score.user_id,
                        beatmap_id: _local_score.beatmap_id,
                    },
                    defaults: {
                        user_id: _local_score.user_id,
                        beatmap_id: _local_score.beatmap_id,
                        mods: _remote_score.mods,
                        date_played: _remote_score.ended_at,
                    }
                });

                if(!created){
                    await instance.update({
                        mods: _remote_score.mods,
                        date_played: _remote_score.ended_at,
                    });
                }
                
                console.log(`[BULK PROCESS MISSING LAZER MODS] Created modded score for user ${score.user_id} on beatmap ${score.beatmap_id}`);
            }catch(err){
                console.log(`[BULK PROCESS MISSING LAZER MODS] Unable to create modded score for user ${score.user_id} on beatmap ${score.beatmap_id} (${pretty_remaining} remaining)`);
            }

        }
        //sleep for 10 seconds
        // console.log(`[BULK PROCESS MISSING LAZER MODS] Sleeping for 10 seconds`);
        // await new Promise(r => setTimeout(r, 10 * 1000));
    }else{
        //sleep for 5 minutes
        await new Promise(r => setTimeout(r, 5 * 60 * 1000));
    }
}

module.exports = {
    BulkProcessMissingLazerMods,
}