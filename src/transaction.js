
/**
 * 
 * @param {Date} date 
 * @param {string} description 
 * @param {string} amount 
 * @param {string} type 
 */
function Transaction(date, description, amount, type) {
  this.date = date;
  this.description = description;
  this.amount = amount;
  this.type = type;

  /**
   * Determines if this transaction and another are equal
   * @param {Transaction} transaction The transaction to compare with this transaction
   * @returns {boolean} A boolean value indicating whether the transactions are equal
   */
  this.equals = (transaction) => {
    return this.date.getTime() == transaction.date.getTime() &&
           this.description == transaction.description &&
           this.amount == transaction.amount &&
           this.type == transaction.type
  }
}

module.exports = Transaction;