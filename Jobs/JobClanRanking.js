const { Op } = require("sequelize");
const { InspectorClan, InspectorClanMember, AltScore, AltBeatmap, InspectorClanRanking } = require("../db");

const cacher = {
    func: UpdateClanRankings,
    name: 'UpdateClanRankings',
}

module.exports = cacher;

async function UpdateClanRankings() {
    //get all clans
    try{
        const date = new Date();
        const clans = await InspectorClan.findAll();

        const all_user_ids = await InspectorClanMember.findAll({ where: {
            clan_id: clans.map(c => c.id),
            pending: false
        } });

        console.log(`[CACHER] Found ${all_user_ids.length} members in all clans ...`);

        //get ALL scores from all members of all clans from THIS month
        const scores = await AltScore.findAll({ 
            where: { 
                //user_id array and date_played
                date_played: {
                    [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    [Op.lt]: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
                },
                user_id: all_user_ids.map(u => u.osu_id)
            },
            include: [
                { model: AltBeatmap, as: 'beatmap', required: true }
            ],
        });

        console.log(`[CACHER] Found ${scores.length} scores this month ...`);

        //associate scores with clans
        // clans[x].scores = scores.filter(s => all_user_ids.find(u => u.osu_id === s.user_id).clan_id === clans[x].id);

        const _cloned_clans = JSON.parse(JSON.stringify(clans));
        _cloned_clans.forEach(clan => {
            const user_ids = all_user_ids.filter(u => u.clan_id === clan.id).map(u => u.osu_id);
            clan.scores = scores.filter(s => user_ids.includes(s.user_id));

            //fix all score pp to 0 if its not a number
            clan.scores = clan.scores.map(s => {
                if(isNaN(s.pp)){
                    s.pp = 0;
                }else{
                    s.pp = parseFloat(s.pp);
                }
                return s;
            });

            clan.ranking_prepared = {
                total_scores: clan.scores.length,
                total_pp: 0,
                weighted_pp: 0,
                total_score: 0,
                total_ss_score: 0,
            };

            if(clan.scores.length > 0){
                clan.scores.sort((a, b) => b.score - a.score);
                clan.ranking_prepared.top_score = clan.scores[0];
                clan.scores.sort((a, b) => b.pp - a.pp);
                clan.ranking_prepared.top_play = clan.scores[0];
                for(let i = 0; i < clan.scores.length; i++){
                    clan.ranking_prepared.weighted_pp += clan.scores[i].pp * 0.95 ** i;
                    clan.ranking_prepared.total_pp += parseFloat(clan.scores[i].pp);
                    clan.ranking_prepared.total_score += parseInt(clan.scores[i].score);
                    if(clan.scores[i].rank === 'X' || clan.scores[i].rank === 'XH'){
                        clan.ranking_prepared.total_ss_score += parseInt(clan.scores[i].score);
                    }
                }
            }
        });

        //remove scores from clans
        _cloned_clans.forEach(clan => {
            delete clan.scores;
        });

        const top_clans = {};

        //also count global stuff just for display
        top_clans.global_stats = {
            total_scores: scores.length,
            total_pp: 0,
            weighted_pp: 0,
            total_score: 0,
            total_ss_score: 0,
        }

        scores.sort((a, b) => b.pp - a.pp);
        for(let i = 0; i < scores.length; i++){
            top_clans.global_stats.weighted_pp += scores[i].pp * 0.95 ** i;
            top_clans.global_stats.total_pp += parseFloat(scores[i].pp);
            top_clans.global_stats.total_score += parseInt(scores[i].score);
            if(scores[i].rank === 'X' || scores[i].rank === 'XH'){
                top_clans.global_stats.total_ss_score += parseInt(scores[i].score);
            }
        }

        // total_scores
        _cloned_clans.sort((a, b) => b.ranking_prepared.total_scores - a.ranking_prepared.total_scores);
        top_clans.total_scores = _cloned_clans.slice(0, 5);

        // total_pp
        _cloned_clans.sort((a, b) => b.ranking_prepared.total_pp - a.ranking_prepared.total_pp);
        top_clans.total_pp = _cloned_clans.slice(0, 5);

        // weighted_pp
        _cloned_clans.sort((a, b) => b.ranking_prepared.weighted_pp - a.ranking_prepared.weighted_pp);
        top_clans.weighted_pp = _cloned_clans.slice(0, 5);

        // top_score
        _cloned_clans.sort((a, b) => b.ranking_prepared.top_score?.score - a.ranking_prepared.top_score?.score);
        top_clans.top_score = _cloned_clans.slice(0, 5);

        // top_play
        _cloned_clans.sort((a, b) => b.ranking_prepared.top_play?.pp - a.ranking_prepared.top_play?.pp);
        top_clans.top_play = _cloned_clans.slice(0, 5);

        // total_score
        _cloned_clans.sort((a, b) => b.ranking_prepared.total_score - a.ranking_prepared.total_score);
        top_clans.total_score = _cloned_clans.slice(0, 5);

        // total_ss_score
        _cloned_clans.sort((a, b) => b.ranking_prepared.total_ss_score - a.ranking_prepared.total_ss_score);
        top_clans.total_ss_score = _cloned_clans.slice(0, 5);

        //set update_date to UTC now
        top_clans.update_date = date;

        //get current UTC (not local) date as YYYY-MM
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const month_str = month < 10 ? `0${month}` : `${month}`;
        const date_str = `${year}-${month_str}`;

        //create or update clan rankings for this month
        const existing = await InspectorClanRanking.findOne({ where: { date: date_str } });
        if(existing){
            existing.data = JSON.stringify(top_clans);
            await existing.save();
        }else{
            await InspectorClanRanking.create({
                date: date_str,
                data: JSON.stringify(top_clans)
            });
        }

        console.log(`[CACHER] Updated clan rankings for ${date_str} ...`);
    }catch(err){
        console.error(err);
    }
}
