const { Sequelize } = require("sequelize");
const { InspectorOsuUser, InspectorTeam, InspectorTeamRuleset, InspectorTeamMember } = require("../db");
const { GetOsuUsers, MODE_SLUGS } = require("../Osu");
const { DOMParser } = require("@xmldom/xmldom");

const cacher = {
    func: UpdateTeams,
    name: 'UpdateTeams',
}

const leaderboard_url = 'https://osu.ppy.sh/rankings/{mode}/team?page=';
const team_url = 'https://osu.ppy.sh/teams/{team_id}';
const PAGE_INTERVAL = 1000; //1 second to prevent spamming and getting rate limited
const TEAMS_PER_PAGE = 50;
const OVERALL_WAIT = 2 * 60 * 60 * 1000; //2 hours
let IS_GENERAL_UPDATE_RUNNING = false;

module.exports = cacher;

async function UpdateTeams() {
    IS_GENERAL_UPDATE_RUNNING = true;

    try {
        let start_time = new Date();
        for await (const mode of MODE_SLUGS) {
            console.log(`[TEAM STATS] Updating ${mode} teams ...`);
            let page = 1;
            let completed = false;

            while (!completed) {
                try {
                    const _url = `${leaderboard_url.replace('{mode}', mode)}${page}`;
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
                    const teams = processTeamLeaderboardPage(text, mode);

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
        console.log(`[TEAM STATS] Error updating teams, skipping ...`);
    }

    IS_GENERAL_UPDATE_RUNNING = false;

    console.log(`[TEAM STATS] Finished updating general team listing`);

    await new Promise(r => setTimeout(r, OVERALL_WAIT));
}

async function UpdateTeamsDetailed() {
    //instead of doing this after the general update, we want to do this separately
    //this is because this is a slow process and we dont want to spam the server

    while (true) {
        try {
            if (IS_GENERAL_UPDATE_RUNNING) {
                //we dont want to run this while the general update is running
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }

            const teams = await InspectorTeam.findAll({
                where: {
                    last_scraped: {
                        [Sequelize.Op.or]: {
                            [Sequelize.Op.lt]: new Date(new Date() - 6 * 60 * 60 * 1000),
                            [Sequelize.Op.eq]: null,
                        }
                    },
                    deleted: false,
                },
                limit: 50
            });

            if (teams.length === 0) {
                console.log(`[TEAM STATS] No teams to scrape, waiting ...`);
                await new Promise(r => setTimeout(r, OVERALL_WAIT));
                continue;
            }

            for await (const team of teams) {
                if (IS_GENERAL_UPDATE_RUNNING) {
                    break;
                }

                await scrapeTeam(team.id);
                await new Promise(r => setTimeout(r, PAGE_INTERVAL * 1.5));
            }
        } catch (err) {
            console.error(err);
        }

        //wait 10 seconds
        await new Promise(r => setTimeout(r, 10 * 1000));
    }
}

async function scrapeTeam(team_id) {
    try {
        const _url = team_url.replace('{team_id}', team_id);
        const res = await fetch(_url, {
            method: 'GET',
        });

        const text = await res.text();

        if (res.status !== 200) {
            throw new Error(`Failed to fetch team ${team_id} with status ${res.status}`);
        }

        const team = processTeamPage(text);

        if (team.tag !== null) {
            //assume success, update or insert

            //first update the team itself
            //it MUST exist, since we are running the scrape based on existing team data
            await InspectorTeam.update({
                short_name: team.tag,
                last_scraped: new Date(),
                applications_open: team.info.team_application,
            }, { where: { id: team_id } });

            //update or insert the members
            await Promise.all(team.members.map(async user => {
                //update or insert
                if (await InspectorTeamMember.findOne({ where: { user_id: user.id } })) {
                    await InspectorTeamMember.update({
                        team_id: team_id,
                        is_leader: user.is_leader || false,
                    }, { where: { user_id: user.id } });
                } else {
                    await InspectorTeamMember.create({
                        team_id: team_id,
                        user_id: user.id,
                        is_leader: user.is_leader || false,
                    });
                }
            }));
        }
        console.log(`[TEAM STATS] Scraped team ${team_id}`);
    } catch (err) {
        console.error(err);
        //if status is 429, wait 5 seconds
        if (err.message.includes('status 429')) {
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

// scrapeTeam(439);

//dont care for mode, since we will track stats for all modes regardless
//this is to get the tag and the full member list
function processTeamPage(text) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const tag = findTeamTag(doc);
    const team_info = findTeamInfo(doc);
    let users = findTeamMembers(doc);

    //set is_leader to true for the team leader, nothing else
    const leader_id = team_info["team_leader"];
    users = users.map(user => {
        if (user.id === leader_id) {
            user.is_leader = true;
        }
        return user;
    });

    const team = {
        tag: tag,
        info: team_info,
        members: users,
    }

    // console.log(team);

    return team;
}

function findTeamTag(doc) {
    const flag_element = doc.getElementsByClassName('profile-info__flag')[0];
    const tag = flag_element.textContent.trim();
    return tag;
}

const INFO_DATA = {
    "team_application": "bool",
    "team_leader": "user",
};

function findTeamInfo(doc) {
    //find all team info entries (class "team-info-entry")
    const info_elements = doc.getElementsByClassName('team-info-entry');

    //info_data key will be content of child element with class "team-info-entry__title"
    //value will be content of child element with class "team-info-entry__value"
    //loop through them
    let info_data = {};

    for (const element of info_elements) {
        let title = element.getElementsByClassName('team-info-entry__title')[0].textContent.trim();
        //lower and replace spaces with _
        title = title.toLowerCase().replace(/ /g, '_');
        if (!INFO_DATA[title]) {
            continue;
        }

        let value_element = element.getElementsByClassName('team-info-entry__value')[0];

        switch (INFO_DATA[title]) {
            case "bool":
                let value = value_element.textContent.trim() === 'Open';
                info_data[title] = value;
                break;
            case "user":
                let elmt = value_element.getElementsByTagName('a')[0];
                let user_id = elmt.getAttribute('data-user-id');
                info_data[title] = parseInt(user_id);
                break;
        }
    }

    return info_data;
}

function findTeamMembers(doc) {
    //find div with class "team-members"
    const members_element = doc.getElementsByClassName('team-members')[0];

    //find all elements with class "js-react--user-card"
    const user_elements = members_element.getElementsByClassName('js-react--user-card');

    //get the data-user attribute from each element
    const user_data_set = Array.from(user_elements).map(element => element.getAttribute('data-user'));
    let users = user_data_set.map(user => JSON.parse(user));

    //filter out where id is null
    users = users.filter(user => user.id);

    //prune useless data, we only need "id" and "username"
    users = users.map(user => {
        return {
            id: user.id,
            username: user.username,
        }
    });

    return users;
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

function processTeamLeaderboardPage(text, mode) {
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
    UpdateTeamsDetailed();
}