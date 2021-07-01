const puppeteer = require('puppeteer');
const common = require('../common');
const Transaction = require('../transaction');
const prompt = require('../prompt');
const Credentials = require('../credentials');

let page = undefined;

const boa = {
  private: {
    getWeekBeforeTheStartOfTheMonth: () => {
      const currentDate = new Date();
    
      currentDate.setDate(1)
      currentDate.setDate(currentDate.getDate() - 7);
    
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    },
    /**
     * @summary Navigates to the next transaction table page
     * @returns {Promise<void>}
     */
    goToPreviousTransactionPage: async () => {
      const previousLink = await page.$("a[name=prev_trans_nav_bottom]");
      await previousLink.click();
      await page.waitForNavigation();
    }
  },
  public: {
    /**
     * @summary Checks if BOA log in was successful otherwise throws an error
     * @returns {Promise<void>}
     */
    checkSuccessfulLogin: async () => {
      const greetingHeader = await page.$(".olb-ao-greeting-message-module");
      const isLoginSuccessful =  greetingHeader != null;

      if(isLoginSuccessful){
        console.log("BOA Successful Login\n");
      } else{
        throw new Error("BOA Unsuccessful Login")
      }
    },
    /**
     * @summary gets the user credentials
     * @returns {Promise<Credentials>}
     */
    getUserCredentials: async () => {
      const email = await prompt.ask("Bank of America Username: ");
      const password = await prompt.ask("Bank of America Password: ", { muted: true });
      
      return new Credentials(email, password);
    },
    /**
     * @summary visits bank of america's website
     * @param {puppeteer.Browser} browser 
     * @returns {Promise<puppeteer.Page>} 
     */
    goto: async (browser) => {
      page = await browser.newPage();

      await page.setViewport({
        width: 1200,
        height: 1200,
        deviceScaleFactor: 1,
      });

      await page.goto("https://www.bankofamerica.com");

      return page;
    },
    /**
     * @summary steps through the BOA 2FA workflow and prompts the user
     * for the auth code
     */
    handle2FA: async () => {
      await common.pages.clickPageElement(page, "#btnARContinue");

      let authCode =  await prompt.ask("Code: ");

      const authnumInput = await page.$("#tlpvt-xsw-authnum");
        
      await authnumInput.type(authCode);
      await authnumInput.press("Enter");

      await page.waitForNavigation();
    },
    /**
     * @summary logs into the bank of america website
     * @param {Credentials} credentials
     */
    login: async credentials => {
      console.log("\nLogging into Bank of America...\n");

      const onlineId = await page.$("#onlineId1");
      const passcode = await page.$("#passcode1");

      await onlineId.type(credentials.username);
      await passcode.type(credentials.password);

      await passcode.press("Enter");

      await page.waitForNavigation();
    },
    /**
     * 
     */
    navigateToAccount: async () => {
      await common.pages.clickPageElement(page, "a[name='DDA_details']", { visible: true });
      await page.waitForNavigation();
    },
    /**
     * Pulls all the more recent, cleared transactions than the latest transaction
     * @param {Array<Transaction>} syncedTransactions A list of transactions that have already been synced
     * @param {{date: Date}} options 
     * @returns {Promise<Array<Transaction>>} An array of the most recent transactions
     */
    pullTransacations: async (syncedTransactions, options) => {
      const clearedTransactions = await page.$$("tr.record.cleared")
      let transactionList = [];
      let reachedDateLimit = false;

      for (let i = 0; i < clearedTransactions.length; i++) {
        const transactionElement = clearedTransactions[i];
        
        let dateString = await common.elements.getElementInnerText(transactionElement, "td.date-action > span");
        let date = new Date(dateString);
        let description = await common.elements.getElementInnerText(transactionElement, "td span.transTitleForEditDesc");
        let amount = await common.elements.getElementInnerText(transactionElement, "td.amount");

        let parsedAmount = common.parseAmount(amount);

        const currentTransaction = new Transaction(date, description, parsedAmount.value, parsedAmount.type);

        let limitDate = boa.private.getWeekBeforeTheStartOfTheMonth();

        if(options && options.date) {
            limitDate = options.date;
        }
        
        const transactionDate = new Date(currentTransaction.date);

        // if the current transaction date is less than the week before the start of the month
        // then we can stop grabbing transactions
        if(transactionDate < limitDate){
          reachedDateLimit = true;
          break;
        }

        // if we find the transaction already in the synced transactions we move on
        if(syncedTransactions.length > 0){

          var syncedTransaction = syncedTransactions.find(t => t.equals(currentTransaction));

          if(syncedTransaction){
            continue;
          }
        }

        transactionList.push(currentTransaction);
      }

      if(!reachedDateLimit){
        // navigate to next page
        await boa.private.goToPreviousTransactionPage();
        // recursively call
        let previousTransactions = await boa.public.pullTransacations(syncedTransactions, options);
        // concat results to transactions
        transactionList = transactionList.concat(previousTransactions);
      }

      return transactionList.sort((a,b) => b.date - a.date);
    },
    /**
     * @summary Indicate is BOA is requiring 2FA
     * @returns {Promise<Boolean>} True if BOA requires 2FA
     */
    requires2FA: async () => {
      let pText = await common.elements.getElementInnerText(page, "p.request-heading");

      if(pText === "Request Authorization Code"){
        return true;
      }
      return false;
    }
  }
}

module.exports = boa.public;