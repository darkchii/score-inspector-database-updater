const moment = require("moment");
const { Databases, InspectorScoreStat, AltBeatmap } = require("../db");
const { Op } = require("sequelize");

const cacher = {
    func: UpdateMonthlyRankings,
    name: 'UpdateMonthlyRankings',
}

module.exports = cacher;

//oct 1 2007
const START_DATE = moment.utc('2007-10-01');

const DATA_TYPES = {
    score: {
        query: 'SUM(scores.score)',
        name: 'score',
    },
    pp: {
        query: 'SUM(scores.pp)',
        name: 'pp',
    },
    ss: {
        query: 'COUNT(CASE WHEN rank LIKE \'%X%\' THEN 1 END)',
        name: 'ss',
    }
}

const DATA_PERIODS = ['year', 'month'];

async function UpdateMonthlyRankings() {
    //get all clans
    try {
        const beatmaps = await AltBeatmap.findAll({
            where: {
                mode: 0,
                approved: {
                    [Op.in]: [1, 2, 4]
                }
            }
        });

        console.log(`[CACHER] Found ${beatmaps.length} beatmaps ...`);

        for await (DATA_PERIOD of DATA_PERIODS) {
            try {
                const current_date = moment.utc();
                let date = moment.utc(START_DATE);

                let DATE_FORMAT = 'YYYY-MM';

                switch (DATA_PERIOD) {
                    case 'year':
                        DATE_FORMAT = 'YYYY';
                        break;
                    case 'month':
                        DATE_FORMAT = 'YYYY-MM';
                        break;
                }

                while (date.isBefore(current_date)) {
                    const _start = date.format('YYYY-MM-DD');
                    date.add(1, DATA_PERIOD);
                    //round date down to the year/month (depending on the period)
                    switch(DATA_PERIOD){
                        case 'year':
                            date.startOf('year');
                            break;
                        case 'month':
                            date.startOf('month');
                            break;
                    }
                    const _end = date.format('YYYY-MM-DD');

                    const _beatmaps = beatmaps.filter(b => b.approved_date >= _start && b.approved_date < _end);
                    const query = `
                    SELECT scores.user_id, users2.username, ${DATA_TYPES.score.query} as score, ${DATA_TYPES.pp.query} as pp, ${DATA_TYPES.ss.query} as ss
                    FROM scores
                    inner join users2 on users2.user_id = scores.user_id
                    WHERE scores.beatmap_id IN (${_beatmaps.map(b => b.beatmap_id).join(',')})
                    GROUP BY scores.user_id, users2.username
                `

                    const response = await Databases.osuAlt.query(query, { type: Databases.osuAlt.QueryTypes.SELECT });

                    for await (DATA_TYPE of Object.keys(DATA_TYPES)) {
                        const _DATA_TYPE = DATA_TYPES[DATA_TYPE];
                        const sorted = response.sort((a, b) => b[_DATA_TYPE.name] - a[_DATA_TYPE.name]);
                        const top = sorted[0];

                        const data = {
                            user_id: top.user_id,
                            username: top.username,
                            period: moment.utc(_start).format(DATE_FORMAT),
                            total_score: top[_DATA_TYPE.name]
                        };

                        const existing = await InspectorScoreStat.findOne({
                            where: {
                                key: `monthly_${_DATA_TYPE.name}_farmers`,
                                period: data.period
                            }
                        });

                        const string_data = JSON.stringify(data);

                        if (existing) {
                            const prev = JSON.parse(existing.value);
                            if ((Number(data.total_score) > Number(prev.total_score)) && (data.user_id !== prev.user_id)) {
                                console.log(`a user overtook the previous top ${_DATA_TYPE.name} farmer for ${data.period}!`);
                                console.log(`old: ${prev.username} (${prev.user_id}) -> ${prev.total_score}`);
                                console.log(`new: ${data.username} (${data.user_id}) -> ${data.total_score}`);

                                const change_data = {
                                    period: data.period,
                                    old_user_id: prev.user_id,
                                    old_username: prev.username,
                                    new_user_id: data.user_id,
                                    new_username: data.username,
                                    old_total_score: prev.total_score,
                                    new_total_score: data.total_score,
                                    time: new Date().toISOString()
                                }

                                const log = await InspectorScoreStat.findOne({
                                    where: {
                                        key: `monthly_${_DATA_TYPE.name}_farmers_log`,
                                        period: 'misc'
                                    }
                                });

                                const log_data = JSON.parse(log.value);

                                log_data.push(change_data);

                                await InspectorScoreStat.update({
                                    value: JSON.stringify(log_data)
                                }, {
                                    where: {
                                        key: `monthly_${_DATA_TYPE.name}_farmers_log`,
                                        period: 'misc'
                                    }
                                });
                            }

                            await InspectorScoreStat.update({
                                value: string_data
                            }, {
                                where: {
                                    key: `monthly_${_DATA_TYPE.name}_farmers`,
                                    period: data.period
                                }
                            });
                        } else {
                            await InspectorScoreStat.create({
                                key: `monthly_${_DATA_TYPE.name}_farmers`,
                                period: data.period,
                                data: string_data
                            });
                        }
                        console.log(`[CACHER] Updated top ${_DATA_TYPE.name} farmer for ${data.period} ...`);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }
    } catch (err) {
        console.error(err);
    }
}
