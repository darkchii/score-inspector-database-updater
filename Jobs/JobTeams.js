const { Sequelize } = require("sequelize");
const { InspectorOsuUser, InspectorTeam, InspectorTeamRuleset } = require("../db");
const { GetOsuUsers, MODE_SLUGS } = require("../Osu");
const { DOMParser } = require("@xmldom/xmldom");

const cacher = {
    func: UpdateTeams,
    name: 'UpdateTeams',
}

const url = 'https://osu.ppy.sh/rankings/{mode}/team?page=';
const PAGE_INTERVAL = 1000; //1 second to prevent spamming and getting rate limited
const TEAMS_PER_PAGE = 50;

module.exports = cacher;

async function UpdateTeams() {
    try {

        let start_time = new Date();
        for await (const mode of MODE_SLUGS) {
            console.log(`[TEAM STATS] Updating ${mode} teams ...`);
            let page = 1;
            let completed = false;

            while (!completed) {
                try {
                    const _url = `${url.replace('{mode}', mode)}${page}`;
                    const res = await fetch(_url, {
                        method: 'GET',
                    });

                    const text = await res.text();

                    if (res.status !== 200) {
                        throw new Error(`Failed to fetch page ${page} with status ${res.status}`);
                    }

                    const is_last = isLastPage(text);
                    //pause for dev
                    //There is no API for this, we scrape it
                    const teams = processTeamPage(text, mode);

                    if (teams.length > 0) {
                        await Promise.all(teams.map(async team => {
                            //update or insert
                            if (await InspectorTeam.findOne({ where: { id: team.id } })) {
                                await InspectorTeam.update({
                                    name: team.name,
                                    flag_url: team.flag_url,
                                    members: team.members,
                                    last_updated: team.last_updated,
                                    deleted: false,
                                }, { where: { id: team.id } });
                            } else {
                                await InspectorTeam.create({
                                    id: team.id,
                                    name: team.name,
                                    flag_url: team.flag_url,
                                    members: team.members,
                                    last_updated: team.last_updated,
                                    deleted: false,
                                });
                            }

                            if (await InspectorTeamRuleset.findOne({ where: { id: team.id, mode: team.mode_int } })) {
                                await InspectorTeamRuleset.update({
                                    play_count: team.play_count,
                                    ranked_score: team.ranked_score,
                                    average_score: team.average_score,
                                    performance: team.performance,
                                    deleted: false,
                                }, { where: { id: team.id, mode: team.mode_int } });
                            } else {
                                await InspectorTeamRuleset.create({
                                    id: team.id,
                                    mode: team.mode_int,
                                    play_count: team.play_count,
                                    ranked_score: team.ranked_score,
                                    average_score: team.average_score,
                                    performance: team.performance,
                                    deleted: false,
                                });
                            }
                        }));
                    }

                    console.log(`[TEAM STATS] Updated ${mode} teams page ${page}`);

                    if (teams.length < TEAMS_PER_PAGE || is_last) {
                        completed = true;
                        break;
                    }
                } catch (err) {
                    console.error(err);
                    console.log(`[TEAM STATS] Error updating ${mode} teams page ${page}, skipping ...`);
                    //dont care, not critical, we dont care about ranking itself, we just update this subset later
                }

                page++;
                await new Promise(r => setTimeout(r, PAGE_INTERVAL));
            }
        }

        await InspectorTeam.update({
            deleted: true,
        }, {
            where: {
                last_updated: {
                    [Sequelize.Op.lt]: start_time
                }
            }
        });
    } catch (err) {
        console.error(err);
    }

    console.log(`[TEAM STATS] Finished updating teams`);
    console.log(`[TEAM STATS] Sleeping for 60 minutes ...`);
    await new Promise(r => setTimeout(r, 60 * 60 * 1000));
}

const TEAM_TABLE_INDICES = {
    // rank: 0, //dont care
    name: 1,
    members: 2,
    play_count: 3,
    ranked_score: 4,
    average_score: 5,
    performance: 6,
}

function processTeamPage(text, mode) {
    //parse the page and update the database
    //return true if there are more pages, false otherwise
    //find every <tr class="ranking-page-table__row">

    //parse as XML (nodejs, so no DOMParser)
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const rows = doc.getElementsByTagName('tr');
    const filtered = Array.from(rows).filter(row => row.getAttribute('class') === 'ranking-page-table__row');

    let teams = [];

    for (const row of filtered) {
        const cells = row.getElementsByTagName('td');
        const team = {};

        for (const [key, index] of Object.entries(TEAM_TABLE_INDICES)) {
            let cell = cells[index];
            if (key === 'name') {
                let name_element = cell.getElementsByTagName('a')[1];
                let name = name_element.textContent;
                name = name.trim();
                let href = name_element.getAttribute('href');
                //the id is always after /teams/, there may be other data after it
                let id = href.split('/teams/')[1].split('/')[0];
                team.id = Number(id);
                team[key] = name;

                //get element with class flag-team
                let flag_element = cell.getElementsByClassName('flag-team')[0];
                //find node with the background image
                let url = flag_element.getAttribute('style');
                if (url) {
                    //extract the url
                    url = url.split('url(')[1].split(')')[0];
                    //remove the quotes ' and "
                    url = url.replace(/['"]/g, '');
                    team.flag_url = url.trim();
                } else {
                    team.flag_url = null;
                }
            } else {
                //its a number string with commas, need to parse this
                team[key] = Number(cell.textContent.replace(/,/g, ''));
            }

            team.mode = mode;
            team.mode_int = MODE_SLUGS.indexOf(mode);
            team.last_updated = new Date();
        }

        teams.push(team);
    }

    return teams;
}

function isLastPage(text) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(text, 'text/html');

    //we need to find span element that contains class "pagination-v2__link" and "pagination-v2__link--quick"
    let spans = doc.getElementsByTagName('span');
    let filtered = Array.from(spans).filter(span => span.getAttribute('class') === 'pagination-v2__link pagination-v2__link--quick pagination-v2__link--disabled');

    //find those with a subelement span with text "next"
    let next = filtered.find(span => span.getElementsByTagName('span')[0].textContent?.replace(/['"]/g, '')?.trim() === 'next');
    //if it exists, we are on the last page because it exists and cant be clicked (span is disabled)
    return Boolean(next);
}

async function Loop() {
    while (true) {
        try {
            await UpdateTeams();
        } catch (err) {
            console.error(err);
            //sleep for 1 minute to prevent spamming
            await new Promise(r => setTimeout(r, 60 * 1000));
        }
    }
}

if (process.env.NODE_ENV === 'production') {
    Loop();
}