//Requires

const { DiscordOAuth2, StateTypes, Scopes } = require("@mgalacyber/discord-oauth2");
const config = require('./config.json');
const express = require('express');
const mysql = require('mysql');
const discordlib = require('discord.js')


//Config Variables

const mysqluser = config.mysqluser;
const mysqlpassword = config.mysqlpassword;
const mysqlhost = config.mysqlhost;
const mysqldatabase = config.mysqldatabase;
const mysqlport = config.mysqlport;
const clientid = config.clientid;
const clientsecret = config.clientsecret;
const clientToken = config.token; 
const redirecturi = config.redirecturi;
const guildid = config.sendinfoguildid;
const channelid = config.sendinfochannelid;
const finalwebpageredirect = config.finalwebpageredirect;

//Apps

const app = express();
const oauth = new DiscordOAuth2({
    clientId: clientid,
    clientSecret: clientsecret,
    clientToken: clientToken,
    redirectUri: redirecturi
});
const mysqlconnection = mysql.createConnection({
    host: mysqlhost,
    port: mysqlport,
    user: mysqluser,
    password: mysqlpassword,
    database: mysqldatabase
});
const botdiscord = new discordlib.Client({
    intents: 53608447,
});

mysqlconnection.connect();


//Bot vriables
botdiscord.on('ready', () => {
    const guild = botdiscord.guilds.cache.get(guildid);

    if (!guild) {
        console.error('Guild not found');
        return;
    }
    const channel = guild.channels.cache.get(channelid);

    if (!channel) {
        console.error('Channel not found');
        return;
    }
    console.log(`Channel ${channel.name} in guild ${guild.name} is ready`);
});


//OAuth

oauth.GenerateOAuth2Url({
    state: StateTypes.UserAuth,
    scope: [
        Scopes.Email,
        Scopes.Identify
    ]
}).then((auth) => {
    console.log(auth);
    app.get('/callback', (req, res) => {
        const { code } = req.query;
        if (code) {
            oauth.GetAccessToken(code).then((token) => {
                console.log('Access token', token);
                const accesstoken = token.accessToken;
                oauth.UserDataSchema.GetUserProfile(token.accessToken).then((userprofile) => {
                    console.log('User profile', userprofile);
                    
                    // Variables
                    const guild = botdiscord.guilds.cache.get(guildid);
                    const channel = guild.channels.cache.get(channelid);
    
                    const email = userprofile.email;
                    const userid = userprofile.id; 
                    const username = userprofile.username;
                    channel.send(`A new login, ${email}, ${userid}, ${username}`);
    
                    const getLastIdQuery = 'SELECT id FROM users ORDER BY id DESC LIMIT 1';
    
                    mysqlconnection.query(getLastIdQuery, function(error, result) {
                        if (error) {
                            console.error('Error fetching last ID:', error);
                            return;
                        }
    
                        let newId = 1;
                        if (result.length > 0) {
                            newId = result[0].id + 1;
                        }
    
                        const insertQuery = `INSERT INTO users (token, email, userid, username, id) VALUES (?, ?, ?, ?, ?)`;
                        const values = [accesstoken, email, userid, username, newId];
    
                        mysqlconnection.query(insertQuery, values, function(error, data) {
                            if (error) {
                                console.error('Error inserting data:', error);
                                return;
                            }
                            console.log('User data inserted successfully');
                        });
                    });
                }).catch(error => {
                    console.error('Error fetching user profile:', error);
                });
            }).catch(error => {
                console.error('Error getting access token:', error);
            });
        }
        res.redirect(finalwebpageredirect);
    });
})
//Listen

app.listen(3000, () => {
    console.log('App listen on port 3000')
})

botdiscord.login(clientToken)
