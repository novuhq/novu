// @ts-nocheck
import chalk from 'chalk';
import gradient from 'gradient-string';

/**
 * This packages is forked from 'chalk-animation' and modified to work with TypeScript.
 */

const { log } = console;
let currentAnimation = null;

const consoleFunctions = {
  log: log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

// eslint-disable-next-line guard-for-in
for (const func in consoleFunctions) {
  console[func] = function () {
    stopLastAnimation();
    // eslint-disable-next-line prefer-rest-params
    consoleFunctions[func].apply(console, arguments);
  };
}

const glitchChars = 'x*0987654321[]0-~@#(____!!!!\\|?????....0000\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t';
const longHsv = { interpolation: 'hsv', hsvSpin: 'long' };

const effects = {
  rainbow(str, frame) {
    const hue = 5 * frame;
    const leftColor = { h: hue % 360, s: 1, v: 1 };
    const rightColor = { h: (hue + 1) % 360, s: 1, v: 1 };

    return gradient(leftColor, rightColor)(str, longHsv);
  },
  pulse(str, frame) {
    // eslint-disable-next-line no-param-reassign
    frame = (frame % 120) + 1;
    const transition = 20;
    const duration = 15;
    const on = '#DD2476';
    const off = '#474747';

    if (frame >= 2 * transition + duration) {
      return chalk.hex(off)(str); // All white
    }
    if (frame >= transition && frame <= transition + duration) {
      return chalk.hex(on)(str); // All red
    }

    // eslint-disable-next-line no-param-reassign
    frame = frame >= transition + duration ? 2 * transition + duration - frame : frame; // Revert animation

    // eslint-disable-next-line id-length
    const g =
      frame <= transition / 2
        ? gradient([
            { color: off, pos: 0.5 - frame / transition },
            { color: on, pos: 0.5 },
            { color: off, pos: 0.5 + frame / transition },
          ])
        : gradient([
            { color: off, pos: 0 },
            { color: on, pos: 1 - frame / transition },
            { color: on, pos: frame / transition },
            { color: off, pos: 1 },
          ]);

    return g(str);
  },
  glitch(str, frame) {
    if ((frame % 2) + (frame % 3) + (frame % 11) + (frame % 29) + (frame % 37) > 52) {
      return str.replace(/[^\r\n]/g, ' ');
    }

    const chunkSize = Math.max(3, Math.round(str.length * 0.02));
    const chunks = [];

    for (let i = 0, { length } = str; i < length; i += 1) {
      const skip = Math.round(Math.max(0, (Math.random() - 0.8) * chunkSize));
      chunks.push(str.substring(i, i + skip).replace(/[^\r\n]/g, ' '));
      i += skip;
      if (str[i]) {
        if (str[i] !== '\n' && str[i] !== '\r' && Math.random() > 0.995) {
          chunks.push(glitchChars[Math.floor(Math.random() * glitchChars.length)]);
        } else if (Math.random() > 0.005) {
          chunks.push(str[i]);
        }
      }
    }

    let result = chunks.join('');
    if (Math.random() > 0.99) {
      result = result.toUpperCase();
    } else if (Math.random() < 0.01) {
      result = result.toLowerCase();
    }

    return result;
  },
  radar(str, frame) {
    const depth = Math.floor(Math.min(str.length, str.length * 0.2));
    const step = Math.floor(255 / depth);

    const globalPos = frame % (str.length + depth);

    const chars = [];
    for (let i = 0, { length } = str; i < length; i += 1) {
      const pos = -(i - globalPos);
      if (pos > 0 && pos <= depth - 1) {
        const shade = (depth - pos) * step;
        chars.push(chalk.rgb(shade, shade, shade)(str[i]));
      } else {
        chars.push(' ');
      }
    }

    return chars.join('');
  },
  neon(str, frame) {
    const color = frame % 2 === 0 ? chalk.dim.rgb(88, 80, 85) : chalk.bold.rgb(213, 70, 242);

    return color(str);
  },
  karaoke(str, frame) {
    const chars = (frame % (str.length + 20)) - 10;
    if (chars < 0) {
      return chalk.white(str);
    }

    return chalk.rgb(255, 187, 0).bold(str.substr(0, chars)) + chalk.white(str.substr(chars));
  },
};

function animateString(str, effect, delay, speed) {
  stopLastAnimation();

  // eslint-disable-next-line no-param-reassign
  speed = speed === undefined ? 1 : parseFloat(speed);
  if (!speed || speed <= 0) {
    throw new Error('Expected `speed` to be an number greater than 0');
  }

  currentAnimation = {
    text: str.split(/\r\n|\r|\n/),
    lines: str.split(/\r\n|\r|\n/).length,
    stopped: false,
    init: false,
    f: 0,
    render() {
      const self = this;
      if (!this.init) {
        log('\n'.repeat(this.lines - 1));
        this.init = true;
      }
      log(this.frame());
      setTimeout(() => {
        if (!self.stopped) {
          self.render();
        }
      }, delay / speed);
    },
    frame() {
      this.f += 1;

      // eslint-disable-next-line @typescript-eslint/no-shadow
      return `\u001B[${this.lines}F\u001B[G\u001B[2K${this.text.map((str) => effect(str, this.f)).join('\n')}`;
    },
    // eslint-disable-next-line @typescript-eslint/no-shadow
    replace(str) {
      this.text = str.split(/\r\n|\r|\n/);
      this.lines = str.split(/\r\n|\r|\n/).length;

      return this;
    },
    stop() {
      this.stopped = true;

      return this;
    },
    start() {
      this.stopped = false;
      this.render();

      return this;
    },
  };
  setTimeout(() => {
    if (!currentAnimation.stopped) {
      currentAnimation.start();
    }
  }, delay / speed);

  return currentAnimation;
}

function stopLastAnimation() {
  if (currentAnimation) {
    currentAnimation.stop();
  }
}

const chalkAnimation = {
  rainbow: (str, speed) => animateString(str, effects.rainbow, 15, speed),
  pulse: (str, speed) => animateString(str, effects.pulse, 16, speed),
  glitch: (str, speed) => animateString(str, effects.glitch, 55, speed),
  radar: (str, speed) => animateString(str, effects.radar, 50, speed),
  neon: (str, speed) => animateString(str, effects.neon, 500, speed),
  karaoke: (str, speed) => animateString(str, effects.karaoke, 50, speed),
};

export default chalkAnimation;
