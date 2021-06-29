const readline = require("readline");

const prompt = {
  private: {
    /**
     * Gets an instance of a readline interface
     * @returns {readline.Interface}
     */
    getReadline: () => {
      return readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
  },
  public: {
    /**
     * @summary Sends the given text to stdout and returns the provided input
     * @param {string} text the message prompt sent to stdout
     * @param {{muted:Boolean}} options
     * @returns {Promise<string>}
     */
    ask: async (text, options) => {
      const rl = prompt.private.getReadline();

      if(options) {
        const { muted } = options;

        rl.stdoutMuted = muted !== undefined ? muted : false;
      }
      
      const promise =  new Promise(resolve => rl.question(text, answer => {
        rl.close();
        resolve(answer);
      }));

      rl._writeToOutput = stringToWrite => {
        if (rl.stdoutMuted)
          rl.output.write("*");
        else
          rl.output.write(stringToWrite);
      };

      return promise;
    }
  }
}

module.exports = prompt.public;