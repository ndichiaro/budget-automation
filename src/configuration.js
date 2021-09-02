const bankFactory = require('./bankFactory');

function Configuration() {
  this.bankInstance = {};
  this.date = undefined;
  this.isHeadless = true;
  this.isInteractive = false;
  this.everydollarEmail = "";
  this.everydollarPassword = "";
  this.bankUsername = "";
  this.bankPassword = "";
}

function parseArgValues(arg, config) {
  var argArr = arg.split("=");

  const value = argArr[1];

  switch (argArr[0].toLocaleLowerCase()) {
    case "--bank":
    case "-b":
      config.bankInstance = bankFactory.getInstance(value);
      break;
    case "--date":
    case "-d":
      config.date = new Date(value);
      break;
    case "-i":
      config.isInteractive = true;
      break;
    case "--everydollar-email":
      config.everydollarEmail = value;
      break;
    case "--everydollar-password":
      config.everydollarPassword = value;
      break;
    case "--bank-username":
      config.bankUsername = value;
      break;
    case "--bank-password":
      config.bankPassword = value;
      break;
    default:
      break;
  }
}

const configuration = {
  /**
   * @summary Parses application arguments for configuration
   * @param {Array<string>} args An array of application arguments
   * @returns {Configuration} A configuration object
   */
   parse: (args) => {
    
    const config = new Configuration();

    args.forEach((val, index) => {

      if(index < 2) {
        return;
      }

      switch (val.toLocaleLowerCase()) {
        case "--headless":
        case "-h":
          config.isHeadless = true;
          break;
        default:
          parseArgValues(val, config);
          break;
      }
    });

    return config;
  }
}

module.exports = {
  Configuration,
  parse: configuration.parse
};