const { addConfigOptions, addAccountOptions } = require('../lib/commonOpts');
const { i18n } = require('@hubspot/cli-lib/lib/lang');
const list = require('./accounts/list');
const rename = require('./accounts/rename');
const use = require('./accounts/use');
const info = require('./accounts/info');
const auth = require('./accounts/auth');

const i18nKey = 'cli.commands.accounts';

exports.command = 'accounts';
exports.describe = i18n(`${i18nKey}.describe`);

exports.builder = yargs => {
  addConfigOptions(yargs, true);
  addAccountOptions(yargs, true);

  yargs
    .command({
      ...list,
      aliases: 'ls',
    })
    .command(rename)
    .command(use)
    .command(info)
    .command(auth)
    .demandCommand(1, '');

  return yargs;
};
