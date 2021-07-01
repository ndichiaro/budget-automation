const puppeteer = require('puppeteer');
const everydollar = require('./src/everydollar');
const config = require('./src/configuration');

(async () => {

  // TODO: retry incorrect BOA code
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

  console.log(`${transactions.length} BOA Transactions Pulled`);

  await everydollar.addTransactions(transactions);
  //await browser.close();
})();