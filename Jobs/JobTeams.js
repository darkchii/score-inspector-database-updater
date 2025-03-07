const { Sequelize } = require("sequelize");
const { InspectorOsuUser, InspectorTeam } = require("../db");
const { GetOsuUsers } = require("../Osu");

const cacher = {
    func: UpdateTeams,
    name: 'UpdateTeams',
}

module.exports = cacher;

async function UpdateTeams(){
    //Updates all osu_users with team_id and the osu_teams table

    const users = await InspectorOsuUser.findAll({
        //random order
        order: [
            [Sequelize.fn('RAND')]
        ],
        raw: true
    });

    const id_chunks = [];

    //split into chunks of 50 (osu api v2 limit)
    for(let i = 0; i < users.length; i += 50){
        id_chunks.push(users.slice(i, i + 50).map(x => x.user_id));
    }

    console.log(`Updating ${id_chunks.length} chunks of 50 users (${users.length} total)`);
    try{
        for await(const chunk of id_chunks){
            const _users = await GetOsuUsers(chunk);

            if(!_users || !_users.length || _users.length === 0){
                //wait 1 minute
                await new Promise(r => setTimeout(r, 60000));
                continue;
            }

            console.log(`Fetched ${_users.length} users`);

            const _users_with_teams = _users.filter(x => x.team);
            console.log(`Found ${_users_with_teams.length} users with teams`);

            if(_users_with_teams.length === 0){
                await new Promise(r => setTimeout(r, 500));
                continue;
            }

            //update team_id InspectorOsuUser team_id
            await Promise.all(_users_with_teams.map(async user => {
                await InspectorOsuUser.update({
                    team_id: user.team.id
                }, {
                    where: {
                        user_id: user.id
                    }
                });
            }));

            //insert/update osu_teams
            await Promise.all(_users_with_teams.map(async user => {
                let team = user.team;
                let exists = await InspectorTeam.findOne({
                    where: {
                        id: team.id
                    }
                });

                if(!exists){
                    try{
                        await InspectorTeam.create({
                            id: team.id,
                            flag_url: team.flag_url,
                            name: team.name,
                            short_name: team.short_name
                        });
                    }catch(err){
                        //it most likely is a race condition, where another one is inserted at the same time
                    }
                }else{
                    await InspectorTeam.update({
                        flag_url: team.flag_url,
                        name: team.name,
                        short_name: team.short_name
                    }, {
                        where: {
                            id: team.id
                        }
                    });
                }
            }));
            await new Promise(r => setTimeout(r, 2500));
        }
    }catch(err){
        console.warn(`Error updating teams`);
        console.warn(err);
    }
}
