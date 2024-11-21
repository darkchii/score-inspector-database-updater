const { Databases } = require("../db")

async function BulkProcessStars(amount = 200){
    const scores = await Databases.osuAlt.query(`
        SELECT * FROM scoresmods
        WHERE star_rating IS NULL
        OR date_played != date_attributes
        LIMIT ${amount}
        `);

    // console.log(`[BULK PROCESS STARS] Processing ${unparsed[0].length} scores ...`);
    
    let api_url = 'http://localhost:5001/attributes';
    if(process.env.NODE_ENV === 'development'){
        api_url = 'http://192.168.178.23:5001/attributes';
    }

    const fetched_ratings = [];

    if(scores[0].length > 0){
        for await (const score of scores[0]){
            const beatmap_id = score.beatmap_id;
            const user_id = score.user_id;
            const ruleset = 0;
            const mods = score.mods;

            const api_body = JSON.stringify({beatmap_id, ruleset, mods});

            const response = await fetch(api_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: api_body,
            });

            const json = await response.json();
            json.user_id = user_id;
            json.beatmap_id = beatmap_id;

            console.log(`[BULK PROCESS STARS] Fetched star rating for user ${user_id} on beatmap ${beatmap_id}`);

            fetched_ratings.push(json);
        }
    }

    if(fetched_ratings.length > 0){
        for await(const rating of fetched_ratings){
            const {user_id, beatmap_id, star_rating, aim_difficulty, speed_difficulty, speed_note_count, flashlight_difficulty, aim_difficult_strain_count, speed_difficult_strain_count, approach_rate, overall_difficulty, drain_rate, max_combo} = rating;

            //set to null if not found
            const query = `
                UPDATE scoresmods
                SET star_rating = ${star_rating},
                aim_difficulty = ${aim_difficulty},
                speed_difficulty = ${speed_difficulty},
                speed_note_count = ${speed_note_count},
                flashlight_difficulty = ${flashlight_difficulty ?? null},
                aim_difficult_strain_count = ${aim_difficult_strain_count},
                speed_difficult_strain_count = ${speed_difficult_strain_count},
                approach_rate = ${approach_rate ?? null},
                overall_difficulty = ${overall_difficulty ?? null},
                drain_rate = ${drain_rate ?? null},
                max_combo = ${max_combo},
                date_attributes = date_played
                WHERE user_id = ${user_id}
                AND beatmap_id = ${beatmap_id}
            `;

            await Databases.osuAlt.query(query);
            console.log(`[BULK PROCESS STARS] Updated star rating for user ${user_id} on beatmap ${beatmap_id}`);
        }
    }

    //sleep for 10 seconds
    await new Promise(r => setTimeout(r, 10000));
}

module.exports = {
    BulkProcessStars,
}