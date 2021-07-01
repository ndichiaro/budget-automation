const puppeteer = require('puppeteer');
const Transaction = require('./transaction');
const common = require('./common');
const prompt = require('./prompt');
const Credentials = require('./credentials');

let page = undefined;

const everydollar = {
  private: {
    /**
     * @summary Parses an array of elements into an array of Transactions
     * @param {Array<puppeteer.ElementHandle>} transactionElements 
     * @returns {Promise<Array<Transaction>>}
     */
    parseTransactionElements: async (transactionElements) => {
      const transactions = [];

      // this is pulled from the page not the element so it can be out of the loop
      const year = await page.$$eval(".BudgetNavigation-year", year => year[0].innerText);

      for (let i = 0; i < transactionElements.length; i++) {
        const element = transactionElements[i];

        const month = await common.elements.getElementInnerText(element, ".day");
        const day = await common.elements.getElementInnerText(element, ".date");
        
        const date = new Date(`${day} ${month} ${year}`);

        const description = await common.elements.getElementInnerText(element, ".transaction-card-merchant");
        
        const amount = await common.elements.getElementInnerText(element, ".money");

        const parsedAmount = common.parseAmount(amount);

        transactions.push(new Transaction(date, description, parsedAmount.value, parsedAmount.type));
      }
      
      return transactions;
    },
    /**
     * Prompts the user if a transaction should be added
     * @param {Transaction} transaction 
     * @return {Promise<Boolean>}
     */
    shouldAddTransaction: async transaction => {
      const message = "Would you like to add\n" +
                      `\tType: ${transaction.type}\n` +
                      `\tDate: ${transaction.date}\n` +
                      `\tDesc: ${transaction.description}\n` +
                      `\tAmnt: ${transaction.amount}\n` +
                      "to EveryDollar? [y/n] ";

      const response = await prompt.ask(message);

      switch (response.toLocaleLowerCase()) {
        case "y":
        case "yes":
          console.log("\n");
          return true;
        case "n":
        case "no":
          console.log("\n");
          return false;
        default:
          throw new Error(`${response} is not a valid response`);
      }
    },
    /**
     * @summary Verifies the element was actually added to the new list
     * @param {Transaction} transaction the transaction added to EveryDollar
     * @returns {Promise<Boolen>}
     */
    verifyTransactionWasAdded: async (transaction) => {
      // click the 'New' tab
      await common.pages.clickPageElement(page, "#unallocated", { visible: true });

      const newCards = await page.$$(".card-body")

      // parse the transactions
      let transactions = await everydollar.private.parseTransactionElements(newCards);

      let addedTransaction = transactions.find(t => t.equals(transaction));
      return addedTransaction !== undefined;
    }
  },
  public: {
    /**
     * @summary Add a set of transactions to every dollar
     * @param {Array<Transaction>} transactions 
     * @param {{isInteractive:Boolean}} options
     * @returns {Promise<Number>}
     */
    addTransactions: async (transactions, options) => {
      let transactionsAdded = 0;
      let transactionsRemaining = transactions.length;

      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        
        let shouldAdd = true;
        
        if(options && options.isInteractive) {
          if(transactionsRemaining < transactions.length) {
            console.log(`${transactionsRemaining} transactions remaining...\n`)
          }

          transactionsRemaining--;
          
          shouldAdd = await everydollar.private.shouldAddTransaction(transaction);
        }

        if(!shouldAdd) {
          continue;
        }

        // 1. Click the 'Add New' button
        await common.pages.clickPageElement(page, "#TransactionDrawer_addNew");

        // 2. select Expense or Income
        if(transaction.type === "Expense"){
          await common.pages.clickPageElement(page, "#TransactionModal_typeExpense");
        } else if (transaction.type === "Income") {
          await common.pages.clickPageElement(page, "#TransactionModal_typeIncome");
        } else {
          throw new Error("Error adding transaction. A transaction must contain a type.")
        }

        // 3. Add transaction amount
        const amountElement = await page.$(".TransactionForm-amountInput");
        await amountElement.type(transaction.amount);

        // 4. Add date
        const dateElement = await page.$("input[name='date']");
        // click into date input to select all text
        await dateElement.click();
        const formattedDate = common.formatDate(transaction.date);
        await dateElement.type(formattedDate);

        // 5. Add description
        const descriptionElement = await page.$("input[placeholder='Where did you spend this money?']");
        await descriptionElement.type(transaction.description);

        // 6. Click 'Submit'
        await common.pages.clickPageElement(page, "#TransactionModal_submit");

        // 7. wait for the module to disappear
        while(true) {
          let modalHeader = await page.$("div.modal-header");

          if(modalHeader == null) {
            break;
          }

          common.sleep(500);
        }

        // 8. validate the transaction was actually added
        const wasAdded = await everydollar.private.verifyTransactionWasAdded(transaction);

        if(!wasAdded) {
          throw new Error("An error occurred while added a transaction")
        }

        if(options && options.isInteractive) {
          transactionsAdded++;
          console.log("Transaction Added");
        }
      }

      return transactionsAdded;
    },
    /**
     * @summary Get a list of the latest transactions entered as tracked, new, or deleted
     * @returns {Promise<<Transaction>>}
     */
    getLatestTransactions: async () => {
      let cards = [];
      const getCardElements = async () => await page.$$(".card-body");

      // click the transactions tray
      await common.pages.clickPageElement(page, "#IconTray_transactions", { visible: true });

      // find the latest date from all tabs
      const newCards = await getCardElements();
      cards = cards.concat(newCards);
      
      // go to tracked and pull the cards
      await common.pages.clickPageElement(page, "#allocated", { visible: true });
      const trackedCards = await getCardElements();
      cards = cards.concat(trackedCards);

      // go to deleted and pull the cards 
      await common.pages.clickPageElement(page, "#deleted", { visible: true });
      const deletedCards = await getCardElements();
      cards = cards.concat(deletedCards);

      // parse the transactions
      let transactions = await everydollar.private.parseTransactionElements(cards);

      if(transactions.length > 0) {
        console.log(`${transactions.length} EveryDollar Transactions Found\n`);
        return transactions.sort((a,b) => b.date - a.date);
      }

      return [];
    },
    /**
     * @summary visits every dollarz website
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

      await page.goto("https://www.everydollar.com/app/sign-in");

      return page;
    },
    /**
     * @summary logs into the every dollar website
     * @param {Credentials} credentials
     */
    login: async credentials => {
      console.log("\nLogging into EveryDollar...\n");

      const emailInput = await page.$("#emailInput");

      await emailInput.type(credentials.username);
      await emailInput.press("Enter");

      const passcodeSelector = "input[type=password]";
      await page.waitForSelector(passcodeSelector, { visible: true });

      const passcode = await page.$(passcodeSelector);

      // not ideal but the site is a SPA and the loader is causing some issues
      await page.waitForTimeout(2000)

      await passcode.type(credentials.password);
      await passcode.press("Enter");

      await page.waitForNavigation();
    },
    /**
     * @summary gets the user credentials
     * @returns {Promise<Credentials>}
     */
    getUserCredentials: async () => {
      const email = await prompt.ask("EveryDollar Email: ");
      const password = await prompt.ask("EveryDollar Password: ", { muted: true });
      return new Credentials(email, password);
    }
  }
}

module.exports = everydollar.public;