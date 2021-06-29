let boa = require('./boa');

function getInstance(bank) {
  switch (bank.toLocaleLowerCase()) {
    case "boa":
      return boa;
    default:
      throw new Error(`${bank} is not a supported bank`);
  }
}

module.exports = {
  getInstance
}