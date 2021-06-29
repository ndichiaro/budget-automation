const puppeteer = require('puppeteer');

/**
 * @summary Performs a click action on an element matching to provided selector 
 * on a given page.
 * @param {puppeteer.Page} page 
 * @param {string} elementSelector 
 * @param {{ visible: boolean}} optionsclickDeletedTransactionTab
 */
async function clickPageElement(page, elementSelector, options){
    await page.waitForSelector(elementSelector, options);

    let element = await page.$(elementSelector);
    await element.click();
}

/**
 * @summary Formats a Date to a string using the m/dd/yyy format
 * @param {Date} date 
 * @returns {String} The string representation of the date
 */
function formatDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

/**
 * Gets the innerText value of a DOM Element
 * @param {puppeteer.ElementHandle} element 
 * @param {string} selector
 * @returns {Promise<string>} 
 */
async function getElementInnerText(element, selector) {
  return await element.$eval(selector, domElement => domElement.innerText);
}

/**
 * @summary Parses an amount string value to obtain the numeric value and the transaction type
 * @param {string} amount 
 * @returns {{type:string, value:string}}
 */
function parseAmount(amount) {
  const type = amount.includes("-") ? "Expense" : "Income";

  let value = amount.replace("-", "");

  if(amount.includes("$")) {
    value = value.replace("$", "");
  }

  return {
    type,
    value
  }
}

/**
 * @summary sets a timeout for a given number of milliseconds
 * @param {Number} ms 
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const common = {
  pages: {
    clickPageElement
  },
  elements: {
    getElementInnerText
  },
  parseAmount,
  formatDate,
  sleep
}

module.exports = common;