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
    },
    /**
     * Rebuilds a muted string to write when backspace is pressed 
     * @param {String} str 
     * @returns {String}
     */
    handleMutedBackspace: str => {
      const strArr = str.split(": ");

      let resultString = `${strArr[0]}: `;

      for (let i = 0; i < strArr[1].length; i++) {
        resultString = resultString.concat("*");
      }

      return resultString;
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

        const isReturn = stringToWrite === "\r\n" || stringToWrite == "\n";
        const isChar = stringToWrite.length === 1;

        if(isReturn) {
          rl.output.write(stringToWrite);
        }else {
          if (rl.stdoutMuted) {
            if(!isChar) {
              rl.output.write(prompt.private.handleMutedBackspace(stringToWrite));
            } else {
              rl.output.write("*");
            }
          } else {
            rl.output.write(stringToWrite);
          }
        }
      };
      return promise;
    }
  }
}

module.exports = prompt.public;