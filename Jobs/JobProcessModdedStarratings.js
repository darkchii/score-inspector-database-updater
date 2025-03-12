const { Databases } = require("../db")

async function BulkProcessStars(amount = 250) {
    const scores = await Databases.osuAlt.query(`
        SELECT * FROM scoresmods
        WHERE 
        star_rating IS NULL OR 
        date_played != date_attributes OR 
        recalc = TRUE
        ORDER BY date_played DESC
        LIMIT ${amount}
        `);

    if (scores[0].length === 0) {
        await new Promise(r => setTimeout(r, 10000));
        return;
    }

    // console.log(`[BULK PROCESS STARS] Processing ${unparsed[0].length} scores ...`);

    let api_url = 'http://localhost:5001';
    if (process.env.NODE_ENV === 'development') {
        api_url = 'http://192.168.178.59:5001';
    }

    if (scores[0].length > 0) {
        let async_sr_calcs = [];
        console.time(`[BULK PROCESS STARS] Processing ${scores[0].length} scores ...`);
        for await (const score of scores[0]) {
            const user_id = score.user_id;
            const data = {
                beatmap_id: score.beatmap_id,
                ruleset: 0,
                mods: score.mods,
            };

            async_sr_calcs.push(new Promise(async (resolve, reject) => {
                const rating = await getAttributes(data, user_id, api_url);
                if (rating) {
                    const {
                        user_id,
                        beatmap_id,
                        star_rating,
                        aim_difficulty,
                        speed_difficulty,
                        speed_note_count,
                        flashlight_difficulty,
                        aim_difficult_slider_count, //added in January 2025 PP update
                        aim_difficult_strain_count,
                        speed_difficult_strain_count,
                        approach_rate,
                        overall_difficulty,
                        drain_rate,
                        max_combo,
                        slider_factor } = rating;

                        const query = `
                        UPDATE scoresmods
                        SET star_rating = ${star_rating},
                        aim_difficulty = ${aim_difficulty},
                        speed_difficulty = ${speed_difficulty},
                        speed_note_count = ${speed_note_count},
                        flashlight_difficulty = ${flashlight_difficulty ?? null},
                        aim_difficult_slider_count = ${aim_difficult_slider_count},
                        aim_difficult_strain_count = ${aim_difficult_strain_count},
                        speed_difficult_strain_count = ${speed_difficult_strain_count},
                        approach_rate = ${approach_rate ?? null},
                        overall_difficulty = ${overall_difficulty ?? null},
                        drain_rate = ${drain_rate ?? null},
                        max_combo = ${max_combo},
                        slider_factor = ${slider_factor},
                        date_attributes = date_played,
                        recalc = FALSE
                        WHERE user_id = ${user_id}
                        AND beatmap_id = ${beatmap_id}
                    `;

                    await Databases.osuAlt.query(query);
                }
                resolve();
            }));
        }

        await Promise.all(async_sr_calcs);
        console.timeEnd(`[BULK PROCESS STARS] Processing ${scores[0].length} scores ...`);
    }
}

async function getAttributes(data, user_id, api_url) {
    // const api_body = JSON.stringify({ data.beatmap_id, data.ruleset, data.mods });
    const api_body = JSON.stringify(data);

    const response = await fetch(`${api_url}/attributes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: api_body,
    });

    const json = await response.json();

    if (json?.star_rating >= 0) {
        json.user_id = user_id;
        json.beatmap_id = data.beatmap_id;

        // console.log(`[BULK PROCESS STARS] Fetched star rating for user ${user_id} on beatmap ${data.beatmap_id}`);

        // fetched_ratings.push(json);

        return json;
    } else {
        // console.log(`[BULK PROCESS STARS] Failed to fetch star rating for user ${user_id} on beatmap ${data.beatmap_id}`);
    }

    return null;
}

module.exports = {
    BulkProcessStars,
}