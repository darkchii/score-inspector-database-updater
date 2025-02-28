const { Databases } = require("../db")

async function BulkProcessStars(amount = 200) {
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
        api_url = 'http://192.168.178.23:5001';
    }

    const fetched_ratings = [];

    if (scores[0].length > 0) {
        for await (const score of scores[0]) {
            const beatmap_id = score.beatmap_id;
            const user_id = score.user_id;
            const ruleset = 0;
            const mods = score.mods;

            const api_body = JSON.stringify({ beatmap_id, ruleset, mods });

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
                json.beatmap_id = beatmap_id;

                console.log(`[BULK PROCESS STARS] Fetched star rating for user ${user_id} on beatmap ${beatmap_id}`);

                fetched_ratings.push(json);
            } else {
                console.log(`[BULK PROCESS STARS] Failed to fetch star rating for user ${user_id} on beatmap ${beatmap_id}`);

                await fetch(`${api_url}/cache?beatmap_id=${beatmap_id}`, {
                    method: 'DELETE',
                });
                //if the cacher fails, it still keeps the "failed" data
                //which is star_rating = -1 and max_combo = 0, the rest is null
                //this usually happens because the osu beatmap file didn't download for whatever reason
                //its typically a one-off thing, so we can just delete the cache and try again later
            }
        }
    }

    if (fetched_ratings.length > 0) {
        const query_promises = [];
        for (const rating of fetched_ratings) {
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

            //set to null if not found
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

            // await Databases.osuAlt.query(query);
            // console.log(`[BULK PROCESS STARS] Updated star rating for user ${user_id} on beatmap ${beatmap_id}`);

            query_promises.push(new Promise((resolve, reject) => {
                Databases.osuAlt.query(query).then(() => {
                    console.log(`[BULK PROCESS STARS] Updated star rating for user ${user_id} on beatmap ${beatmap_id}`);
                    resolve();
                }).catch((err) => {
                    console.log(`[BULK PROCESS STARS] Failed to update star rating for user ${user_id} on beatmap ${beatmap_id}`);
                    console.log(err);
                    resolve();
                });
            }));
        }

        await Promise.all(query_promises);
    }
}

module.exports = {
    BulkProcessStars,
}