import { askLine, askSecret } from '../cli-io';
import { drawMascot, SHIMMER, type Theme, toCells } from '../mascot/drawing';
import { createMascotLife, type Emotion, type MascotMoment, restingFace } from '../mascot/life';
import {
  fitScreen,
  heightOf,
  type Look,
  layoutScreen,
  paintMascot,
  type ScreenFit,
  type ScreenRow,
  type ScreenView,
} from './layout';
import { setOpenedScreen } from './opened';
import { BEGIN_FRAME, END_FRAME, HIDE_CURSOR, repaint, SHOW_CURSOR } from './painter';
import type { AskOptions, Screen, ScreenOptions, ScreenWait } from './screen';
import { animationOff, type ColorMode, CSI, charWidth, rowsOf, stripEscapes, type TerminalStream } from './terminal';

/** An output stream the screen draws on, such as `process.stdout`. */
export interface ScreenStream extends TerminalStream {
  write(chunk: string | Uint8Array, ...rest: unknown[]): boolean;
  on?(event: 'resize', listener: () => void): unknown;
  off?(event: 'resize', listener: () => void): unknown;
}

/** Everything the screen needs from where it runs. {@link processHost} is the real one; tests make their own. */
export interface ScreenHost {
  out: ScreenStream;
  /** Kept free of stray writes while the screen is drawn, as stdout is. */
  err: ScreenStream;
  colors: ColorMode;
  /** How tall a row of braille dots is for one dot's width; see `askTerminal`. */
  aspect: number;
  /** Whether the terminal's background is dark or light; see `askTerminal`. */
  theme: Theme;
  /** `false` draws the still faces only, and nothing moves. */
  animate: boolean;
  now: () => number;
  random: () => number;
  /** Calls `frame` every `ms`. It never keeps the process alive, unless it is held. */
  every: (ms: number, frame: () => void) => { stop: () => void; hold: (keep: boolean) => void };
  /** Runs `task` once whatever is under way right now has finished. */
  later: (task: () => void) => void;
  /** Asks on the terminal, as `readline` does, and gives the answer. */
  ask: (question: string, secret: boolean) => Promise<string>;
  /** Calls `listener` before the process exits or is interrupted. Gives the way to stop listening. */
  beforeExit: (listener: () => void) => () => void;
}

/** 30 frames a second. */
const FRAME_MS = 1000 / 30;
const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_FRAME_MS = 80;
/** The spinner's place where nothing moves. */
const STILL_SPINNER = '•';
/** The most a change of emotion at the end can take: the longest blink, a smile going, the eyes closing. */
const SETTLES_WITHIN_MS = 3000;
/** Shown for a secret answer, whatever its length. */
const HIDDEN_ANSWER = '••••••••';
/**
 * Escapes other than colours and styles, which absorbed text has no use for: control sequences ending in
 * anything but `m` (the colours), and OSC strings.
 */
const MOVES = /\x1b\[[0-?]*[ -/]*[@A-Za-ln-z[\\\]^_`{|}~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

/** The host for a real run: the process's streams and clock, and `readline` to ask. */
export function processHost(colors: ColorMode, { aspect, theme }: { aspect: number; theme: Theme }): ScreenHost {
  return {
    out: process.stdout,
    err: process.stderr,
    colors,
    aspect,
    theme,
    animate: !animationOff(process.env),
    now: () => Date.now(),
    random: Math.random,
    every: (ms, frame) => {
      const timer = setInterval(frame, ms);
      timer.unref();

      return {
        stop: () => clearInterval(timer),
        hold: (keep) => (keep ? timer.ref() : timer.unref()),
      };
    },
    later: (task) => setImmediate(task),
    ask: (question, secret) => (secret ? askSecret(question) : askLine(question)),
    beforeExit: (listener) => {
      // Ctrl-C would end the process without a word; the terminal is put right first, and then it does.
      const interrupt = () => {
        stop();
        listener();
        process.kill(process.pid, 'SIGINT');
      };
      const stop = () => {
        process.off('exit', listener);
        process.off('SIGINT', interrupt);
      };
      process.on('exit', listener);
      process.on('SIGINT', interrupt);

      return stop;
    },
  };
}

/**
 * Starts drawing the screen on `host` and keeps it up to date: 30 times a second while something moves,
 * and at once whenever it changes. Each frame rewrites only the lines that changed, all at once where the
 * terminal can, with the cursor hidden. Where the terminal is too short for even the barest screen, or
 * doesn't say how tall it is, nothing can be redrawn in place: the screen is printed as it stands each time
 * something is waited for or asked, and once at the end.
 *
 * Nothing else may write over it while it is drawn: anything the command writes to stdout or stderr behind
 * its back joins the list instead, and only questions and their menus are written below it, then cleared.
 */
export function startLiveScreen({ command, handle = 'agent' }: ScreenOptions, host: ScreenHost): Screen {
  const { out, err, colors, aspect, theme } = host;
  const look: Look = { colors, theme };
  const life = createMascotLife({ random: host.random });
  // Bound now, before stray writes are kept off the terminal: the screen's own writes go through as they are.
  const writeOut: (text: string) => boolean = out.write.bind(out);

  let feeling: Emotion = 'awake';
  let subtitle: string | undefined;
  let rows: ScreenRow[] = [];
  let activity: string | undefined;
  let waits: ScreenWait[] = [];
  // The lines on the terminal, the screen's own rows above the cursor.
  let painted: string[] = [];
  let live = (out.rows ?? 0) > 0;
  let asking = false;
  // The question being asked doesn't start on a line of its own, so a blank line keeps it from the screen.
  let gap = false;
  // What has been written below the screen since it was last drawn, in rows, and where the cursor is in the last.
  let below: { rows: number; column: number } | null = null;
  let lostTrack = false;
  let lastAnswer: { question: string; row: ScreenRow } | undefined;
  let absorbed = '';
  let paintQueued = false;
  let lastSnapshot = '';
  let finished = false;
  let settled: (() => void) | undefined;
  let ticker: ReturnType<ScreenHost['every']> | undefined;

  const columns = () => out.columns ?? 80;

  const view = (): ScreenView => {
    const latest = [...waits].reverse();
    const status = asking ? undefined : (latest[0]?.status ?? (activity ? { text: activity } : undefined));

    return {
      command,
      handle,
      emotion: feeling === 'awake' && status ? 'thinking' : feeling,
      subtitle: latest.find((wait) => wait.subtitle !== undefined)?.subtitle ?? subtitle,
      rows: [...rows, ...waits.flatMap((wait) => wait.rows ?? [])],
      figure: latest.find((wait) => wait.figure)?.figure,
      status,
    };
  };

  const linesFor = (shown: ScreenView, fit: ScreenFit, moment: MascotMoment, now: number, final: boolean) => {
    const mascot = fit.mascotWidth
      ? paintMascot(
          toCells(
            drawMascot(fit.mascotWidth, moment.face, { aspect, theme, time: now, shimmer: moment.still ? 0 : SHIMMER })
          ),
          look,
          columns()
        )
      : undefined;
    const spinner =
      host.animate && !final ? SPINNER[Math.floor(now / SPINNER_FRAME_MS) % SPINNER.length] : STILL_SPINNER;

    return layoutScreen(shown, { columns: columns(), look, mascot, spinner, final, gap: asking && gap, ...fit });
  };

  const momentNow = (now: number, emotion: Emotion): MascotMoment => {
    life.feel(emotion, now);
    const moment = life.frame(now);
    if (moment.settled) {
      settled?.();
    }

    return host.animate ? moment : { face: restingFace(emotion), still: true, settled: true };
  };

  /** Draws the screen as it is now, in place. Gives up drawing in place where it no longer fits. */
  const draw = (reserve = 0) => {
    const now = host.now();
    const shown = view();
    const moment = momentNow(now, shown.emotion);
    const size = { columns: columns(), rows: out.rows ?? 0, aspect };
    // Without room for a question below, the screen is drawn as it is anyway, and drawn anew below it after.
    const fit = fitScreen(shown, { ...size, reserve }) ?? (reserve > 0 ? fitScreen(shown, size) : null);
    if (!fit) {
      // The last frame goes, and the screen as it stands now is printed once instead: a wait's link or code
      // to scan that no longer fits in place is still there to read.
      if (painted.length > 0 && !lostTrack) {
        writeOut(`${BEGIN_FRAME}${CSI}${heightOf(painted, columns())}F${CSI}J${END_FRAME}`);
      }
      painted = [];
      stopDrawingInPlace();
      snapshot();

      return;
    }

    const lines = linesFor(shown, fit, moment, now, false);
    writeOut(repaint(painted, lines, columns()));
    painted = lines;
  };

  const tick = () => {
    if (!finished && live && !below) {
      draw();
    }
  };

  const startTicking = () => {
    if (host.animate && live && !ticker) {
      ticker = host.every(FRAME_MS, tick);
    }
  };

  const stopTicking = () => {
    ticker?.stop();
    ticker = undefined;
  };

  /** Prints the screen as it stands, without the mascot, unless the very same was printed last. */
  const snapshot = () => {
    const text = layoutScreen(view(), { columns: columns(), look, spinner: STILL_SPINNER, final: true })
      .map((line) => `${line}\n`)
      .join('');
    if (text !== lastSnapshot) {
      writeOut(text);
      lastSnapshot = text;
    }
  };

  const stopDrawingInPlace = () => {
    live = false;
    stopTicking();
    unguard();
    writeOut(SHOW_CURSOR);
    settled?.();
  };

  /** How many rows `text` takes below the screen, from the start of a line. */
  const rowsBelow = (text: string) => text.split('\n').reduce((sum, line) => sum + rowsOf(line, columns()), 0);

  /** The screen as it is left at the end: the mascot's still face for `emotion`, as large as fits. */
  const finalLines = (emotion: Emotion) => {
    const shown = view();
    // Where the terminal doesn't say how tall it is, the screen is printed once and may take what it needs.
    const height = out.rows || Number.MAX_SAFE_INTEGER;
    const fit = fitScreen(shown, { columns: columns(), rows: height, aspect, final: true }) ?? {
      compact: false,
      hiddenRows: 0,
    };

    return linesFor(shown, fit, { face: restingFace(emotion), still: true, settled: true }, host.now(), true);
  };

  /** Clears what was written below the screen, and draws it again; or, out of reach by now, anew below. */
  const resume = () => {
    if (!below) {
      return;
    }

    if (live) {
      writeOut(HIDE_CURSOR);
      const reachable = !lostTrack && heightOf(painted, columns()) + below.rows + 1 <= (out.rows ?? 0);
      if (reachable) {
        writeOut(`${BEGIN_FRAME}${below.rows > 0 ? `${CSI}${below.rows}F` : '\r'}${CSI}J${END_FRAME}`);
      } else {
        if (below.column > 0) {
          writeOut('\n');
        }
        painted = [];
      }
    }

    below = null;
    lostTrack = false;
    startTicking();
  };

  const changed = () => {
    if (finished) {
      return;
    }
    if (below && !asking) {
      resume();
    }
    if (!paintQueued) {
      paintQueued = true;
      queueMicrotask(() => {
        paintQueued = false;
        tick();
      });
    }
  };

  /** Stops drawing for text written below the screen: a menu, a question. */
  const goBelow = (reserve: number) => {
    if (below) {
      return;
    }

    if (live) {
      draw(reserve);
      stopTicking();
    } else {
      snapshot();
    }
    below = { rows: 0, column: 0 };
  };

  /** Follows the cursor through `text` written below the screen. */
  const countBelow = (text: string) => {
    if (!below) {
      return;
    }

    for (const char of stripEscapes(text)) {
      const width = charWidth(char.codePointAt(0) ?? 0);
      if (char === '\n') {
        below.rows += 1;
        below.column = 0;
      } else if (char === '\r') {
        below.column = 0;
      } else if (below.column + width > columns()) {
        below.rows += 1;
        below.column = width;
      } else {
        below.column += width;
      }
    }
  };

  const finishActivity = (mark: ScreenRow['mark']) => {
    if (activity) {
      rows.push({ mark, value: activity.replace(/(\.\.\.|…)$/, '') });
      activity = undefined;
    }
  };

  /** Text written behind the screen's back joins the list, a row a line. */
  const absorb = (text: string) => {
    absorbed += text.replace(MOVES, '').replace(/\r\n?/g, '\n');
    const lines = absorbed.split('\n');
    absorbed = lines.pop() ?? '';
    const added = lines.filter((line) => stripEscapes(line).trim()).map((line) => ({ value: line.trimEnd() }));
    if (added.length > 0) {
      rows.push(...added);
      changed();
    }
  };

  const guard = (stream: ScreenStream) => {
    const original = stream.write;
    const passOn = (chunk: string | Uint8Array, rest: unknown[]): boolean => original.call(stream, chunk, ...rest);
    const guarded = (chunk: string | Uint8Array, ...rest: unknown[]): boolean => {
      if (finished || !live || asking) {
        return passOn(chunk, rest);
      }

      const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
      if (below) {
        countBelow(text);

        return passOn(chunk, rest);
      }

      absorb(text);
      // The write is done, as far as the writer can tell.
      for (const argument of rest) {
        if (typeof argument === 'function') {
          argument();
        }
      }

      return true;
    };
    stream.write = guarded;

    return () => {
      if (stream.write === guarded) {
        stream.write = original;
      }
    };
  };

  const unguards: Array<() => void> = [];
  const unguard = () => {
    for (const restore of unguards.splice(0)) {
      restore();
    }
  };

  const onResize = () => {
    if (finished || !live) {
      return;
    }
    if (below) {
      lostTrack = true;

      return;
    }

    // A terminal that rewraps its lines on a resize has rewrapped the screen too: it is cleared as it now
    // stands, and drawn afresh.
    const height = heightOf(painted, columns());
    if (height + 1 <= (out.rows ?? 0)) {
      writeOut(`${BEGIN_FRAME}${height > 0 ? `${CSI}${height}F` : ''}${CSI}J${END_FRAME}`);
    }
    painted = [];
    changed();
  };

  /** Leaves the screen with the mascot's still face for `emotion`, and gives the terminal back. */
  const leave = (emotion: Emotion) => {
    finished = true;
    stopTicking();
    if (absorbed.trim()) {
      rows.push({ value: absorbed.trimEnd() });
    }

    if (live) {
      writeOut(`${repaint(painted, finalLines(emotion), columns())}${SHOW_CURSOR}`);
    } else {
      writeOut(
        finalLines(emotion)
          .map((line) => `${line}\n`)
          .join('')
      );
    }

    unguard();
    out.off?.('resize', onResize);
    stopListening();
    setOpenedScreen(null);
  };

  // A process that ends without the command ending its screen (an uncaught error, Ctrl-C) still leaves
  // what was said on it, what was written behind its back included, and the cursor showing.
  const stopListening = host.beforeExit(() => {
    if (!finished) {
      resume();
      leave(feeling);
    }
  });

  const end = async (emotion: Emotion) => {
    if (finished) {
      return;
    }

    resume();
    finishActivity('done');
    waits = [];
    feeling = emotion;
    life.settle(emotion, host.now());

    if (live && host.animate) {
      startTicking();
      ticker?.hold(true);
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, SETTLES_WITHIN_MS);
        settled = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
    }

    leave(emotion);
  };

  const screen: Screen = {
    feel: (emotion) => {
      feeling = emotion;
      changed();
    },
    subtitle: (text) => {
      subtitle = text;
      changed();
    },
    rows: (list) => {
      activity = undefined;
      rows = [...list];
      changed();
    },
    add: (...list) => {
      finishActivity('done');
      rows.push(...list);
      changed();
    },
    say: (message) => {
      finishActivity('done');
      if (/(\.\.\.|…)$/.test(message)) {
        activity = message.replace(/\.\.\.$/, '…');
      } else {
        rows.push({ mark: 'info', value: message });
      }
      changed();
    },
    wait: (wait) => {
      finishActivity('done');
      waits.push(wait);
      changed();
      if (!live && !finished) {
        snapshot();
      }

      return () => {
        if (!waits.includes(wait)) {
          return;
        }

        waits = waits.filter((other) => other !== wait);
        if (wait.said) {
          rows.push({ mark: 'info', value: wait.said });
        }
        changed();
      };
    },
    print: (text) => {
      if (finished) {
        writeOut(text);

        return;
      }

      // Room for the text, and for the question and answer that usually follow it.
      goBelow(rowsBelow(text) + 2);
      writeOut(text);
      countBelow(text);
    },
    ask: async (question, options: AskOptions = {}) => {
      const { secret = false, remember } = options;
      if (finished) {
        return host.ask(question, secret);
      }

      finishActivity('done');
      asking = true;
      gap = !below && !question.startsWith('\n');
      let answer: string;
      try {
        // Room for the question, a line for the answer, and the blank line above them.
        goBelow(rowsBelow(question) + (gap ? 2 : 1));
        // The cursor shows where the answer goes while it is typed; it hides again when drawing resumes.
        if (live) {
          writeOut(SHOW_CURSOR);
        }
        answer = await host.ask(question, secret);
      } finally {
        asking = false;
      }

      countBelow(`${question}${secret ? '' : answer}\n`);
      const row = remember
        ? remember(answer)
        : answer.trim()
          ? { mark: 'done' as const, value: `${question.trim()} ${secret ? HIDDEN_ANSWER : answer.trim()}` }
          : undefined;
      keepAnswer(question, row);
      // A question asked again at once (the answer wasn't right) keeps the screen as it is until then.
      host.later(() => {
        if (!asking && !finished) {
          changed();
        }
      });

      return answer;
    },
    done: (emotion) => end(emotion),
    fail: async (message, { pending = false } = {}) => {
      // What was under way didn't finish, so it stays without a mark of its own.
      finishActivity('info');
      waits = [];
      rows.push({ mark: pending ? 'next' : 'failed', value: message });
      await end('asleep');
    },
  };

  /** The answer joins the list, in place of the last answer to the same question asked again. */
  const keepAnswer = (question: string, row: ScreenRow | undefined) => {
    if (!row) {
      return;
    }

    if (lastAnswer?.question === question && rows[rows.length - 1] === lastAnswer.row) {
      rows[rows.length - 1] = row;
    } else {
      rows.push(row);
    }
    lastAnswer = { question, row };
  };

  setOpenedScreen(screen);
  if (live) {
    writeOut(HIDE_CURSOR);
    unguards.push(guard(out), guard(err));
    out.on?.('resize', onResize);
    startTicking();
    changed();
  }

  return screen;
}
