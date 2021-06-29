const bankFactory = require('./bankFactory');

function Configuration() {
  const $this = this;

  this.isHeadless = true;

  this.bankInstance = {};
}

function parseArgValues(arg, config) {
  var argArr = arg.split("=");

  switch (argArr[0].toLocaleLowerCase()) {
    case "--bank":
    case "-b":
      config.bankInstance = bankFactory.getInstance(argArr[1]);
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
        case "--degug":
        case "-d":
          config.isHeadless = false;
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