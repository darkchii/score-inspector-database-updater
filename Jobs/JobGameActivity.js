const { Databases, InspectorScoreStat } = require("../db");

const cacher = {
    func: UpdateActivity,
    name: 'UpdateActivity',
}

module.exports = cacher;

async function UpdateActivity() {
    try {
        const active_players = await GetActivePlayerCount();

        if (active_players.length === 0) {
            return;
        }

        if (InspectorScoreStat.findOne({ where: { key: 'active_players' } })) {
            await InspectorScoreStat.destroy({ where: { key: 'active_players' } });
        }

        await InspectorScoreStat.create({
            key: 'active_players',
            period: 'misc',
            value: JSON.stringify(active_players)
        })

    } catch (err) {

    }

}

async function GetActivePlayerCount() {
    //Get the count of active players for each hour of the last 24 hours
    //Basically amount of unique user_ids that have submitted a score in each hour
    //0 = 24 hours ago, 23 = now
    const active_players = await Databases.osuAlt.query(`
        SELECT
            COUNT(DISTINCT user_id) as count,
            EXTRACT(HOUR FROM date_played) as hour,
            MAX(date_played) as last_played
        FROM scores
        WHERE
            date_played > NOW() - INTERVAL '24 hours'
        GROUP BY hour
        ORDER BY last_played ASC
    `);

    if (active_players[0].length === 0) {
        return [];
    }

    for (let i = 0; i < active_players[0].length; i++) {
        //Round last_played to the lower hour
        active_players[0][i].hour = new Date(active_players[0][i].last_played).setMinutes(0, 0, 0);

        delete active_players[0][i].last_played;
    }

    return active_players?.[0];
}