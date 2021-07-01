const puppeteer = require('puppeteer');
const everydollar = require('./src/everydollar');
const config = require('./src/configuration');
const prompt = require('./src/prompt');

(async () => {

  // TODO: retry incorrect BOA code
  // TODO: fix prompt what backspace is clicked
  const configuration = config.parse(process.argv);

  const { bankInstance } = configuration;

  const browser = await puppeteer.launch({
    headless: configuration.isHeadless,
    devtools: true
  });

  await everydollar.goto(browser);

  const everydollarCreds = await everydollar.getUserCredentials();

  await everydollar.login(everydollarCreds);

  const recentTransactions = await everydollar.getLatestTransactions();

  await bankInstance.goto(browser);  

  const bankCredentials = await bankInstance.getUserCredentials();
  await bankInstance.login(bankCredentials);

  const requires2FA = await bankInstance.requires2FA();

  if(requires2FA){
    await bankInstance.handle2FA();
  }

  await bankInstance.checkSuccessfulLogin();
  await bankInstance.navigateToAccount();

  const transactions = await bankInstance.pullTransacations(recentTransactions, { 
    date: configuration.date
  });

  console.log(`${transactions.length} BOA Transactions Pulled\n`);

  const added = await everydollar.addTransactions(transactions, {
    isInteractive: configuration.isInteractive
  });

  if(added == 1) {
    console.log(`${added} transaction was added\n`);
  } else {
    console.log(`${added} transactions were added\n`);
  }

  await prompt.ask("Press any key to exit...");

  await browser.close();
})();