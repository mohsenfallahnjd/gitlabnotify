/**
 * @author Mohsen Fallahnejad
 * @name gitlabNotify
 * @source https://github.com/jdalrymple/gitbeaker/blob/master/packages/core/src/resources/MergeRequests.ts
 */
const telegram = require('telegram-bot-api');
const { Gitlab } = require('@gitbeaker/node');
const cron = require('node-cron');
const nconf = require('nconf');

/**
 * Register nconf as storage
 */
nconf.use('file', { file: './config.json' });
nconf.load();

/**
 * Gitlab Register
 */
const gitlab = new Gitlab({
    host : nconf.get('git:host'),
    token: nconf.get('git:token'),
});

/**
 * Telegram bot Register
 */
const api = new telegram({
    token : nconf.get('botToken'),
    updates: {
        enabled: true
    }
});

/**
 * Save user information
 */
api.on('update', update => {
    const { message } = update;

    if (message.text === '/start') nconf.set('user:id', message.from.id);

    // Save Storage
    nconf.save(function (err) {
      if (err) return console.error(err.message);
      console.log('Configuration saved successfully.');
    });
})

/**
 * Get MergeRequests.
 * 
 * @param {number} groupId - The group ID
 */
function getMrs(groupId) {
    gitlab.MergeRequests.all({
        groupId,
        state: 'opened',
        scope: 'assigned_to_me',
        sort : 'desc'
    }).then(async (res) => {
        if (res.length) {
            let list = '';
            for await (const item of res) {
                if(res.indexOf(item)) list += `\`\-\-\-\`\n\n`;

                list += `🏃‍♂️ *Hurry up man, ${item.author.name} is waiting for you ...*\n`
                + `\n\# ${item.title.toUpperCase()}\n\n\> [Link](${item.web_url}) |\t\`${item.references.full.split('/')[item.references.full.split('/').length - 1]}\`\t|\n`
                + `\> Merge Status: ${item.merge_status === 'can_be_merged' ? '✅' : `❌ \`${item.merge_status.replace(/_/gm, ' ')}\`` }`
                + `\n\> Draft : \t${!!item.draft ? '✅' : '❌' }\n\n`;
            }
            await api.sendMessage({
                chat_id: nconf.get('user:id'),
                disable_web_page_preview: 1,
                parse_mode: 'Markdown',
                text: list,
            });
        }
    }).catch(error => {
        console.log(error);
    });
}

/**
 * cron job time
 *
 * @description This schedule is working time between 9:00 am and 19:00 pm (tehran timezone) and checking each 3 minutes.
 * @source https://crontab.guru/
 */
cron.schedule('*/3 9-19 * * *', () => { getMrs(nconf.get('git:groupId')); }, { timezone : "Asia/Tehran" });
