import { askLine, askOffering, askSecret, type ReadOptions, readAnswer } from '../cli-io';
import { drawMascot, SHIMMER, type Theme, toCells } from '../mascot/drawing';
import { createMascotLife, type Emotion, type MascotMoment, restingFace } from '../mascot/life';
import {
  fitScreen,
  heightOf,
  type Look,
  layoutScreen,
  paint,
  paintMascot,
  type ScreenFit,
  type ScreenRow,
  type ScreenView,
  typedAnswer,
} from './layout';
import { setOpenedScreen } from './opened';
import { BEGIN_FRAME, END_FRAME, HIDE_CURSOR, repaint, SHOW_CURSOR } from './painter';
import type { AskNote, AskOptions, Screen, ScreenOptions, ScreenWait } from './screen';
import { animationOff, type ColorMode, CSI, stripEscapes, type TerminalStream } from './terminal';

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
  /** Reads an answer typed on the terminal, writing nothing, for the screen to draw it. */
  read: (options: ReadOptions) => Promise<string>;
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
/** How long the caret stays on, and then off, once the typing stops. */
const CARET_BLINK_MS = 530;
/** How long the person has to stop typing before an answer is checked. */
const CHECK_AFTER_MS = 250;
/** Under an answer while it is checked. */
const CHECKING: AskNote = { text: 'checking…', tone: 'muted' };
/**
 * Escapes other than colours and styles, which absorbed text has no use for: control sequences ending in
 * anything but `m` (the colours), and OSC strings.
 */
const MOVES = /\x1b\[[0-?]*[ -/]*[@A-Za-ln-z[\\\]^_`{|}~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

/** A question being answered on the screen. */
interface Asked {
  /** The lines above the one the answer goes on, for a question of several. */
  above: string[];
  prompt: string;
  secret: boolean;
  suffix?: string;
  display?: (answer: string) => string;
  answer: string;
  cursor: number;
  typedAt: number;
  /** Keeps a line under the question even while it says nothing, so the screen doesn't jump. */
  noted: boolean;
  note?: AskNote;
}

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
    read: (options) => readAnswer(options),
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
 * its back joins the list instead. A question is part of it too, so the screen keeps moving while it waits.
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
  let asked: Asked | null = null;
  // What was written for the question that comes next, such as a menu.
  let printed: ScreenRow[] = [];
  // The question answered last: the row that keeps the answer, and how many printed lines came with it.
  let lastAsked: { question: string; row?: ScreenRow; printed: number } | undefined;
  let absorbed = '';
  let paintQueued = false;
  let lastSnapshot = '';
  let finished = false;
  let settled: (() => void) | undefined;
  let ticker: ReturnType<ScreenHost['every']> | undefined;

  const columns = () => out.columns ?? 80;
  const size = () => ({ columns: columns(), rows: out.rows ?? 0, aspect });

  /** A question as rows: its words, then the answer as it is typed with what is said about it under it. */
  const askedRows = (question: Asked): ScreenRow[] => {
    const caret = !host.animate || Math.floor((host.now() - question.typedAt) / CARET_BLINK_MS) % 2 === 0;
    const { answer, cursor, secret, suffix, display } = question;
    const typed = display
      ? typedAnswer(display(answer), display(answer.slice(0, cursor)).length, { secret, suffix, caret, look })
      : typedAnswer(answer, cursor, { secret, suffix, caret, look });
    const note = question.note ? paint(question.note.text, question.note.tone, look) : '';

    return [
      ...question.above.map((value) => ({ value })),
      // One row, so that folding the list for a small window can't part the answer from its note.
      { mark: 'next', value: `${question.prompt}${typed}${question.noted ? `\n${note}` : ''}` },
    ];
  };

  const view = (question = asked): ScreenView => {
    const latest = [...waits].reverse();
    const status = asking ? undefined : (latest[0]?.status ?? (activity ? { text: activity } : undefined));

    return {
      command,
      handle,
      emotion: feeling === 'awake' && status ? 'thinking' : feeling,
      subtitle: latest.find((wait) => wait.subtitle !== undefined)?.subtitle ?? subtitle,
      rows: [
        ...rows,
        ...waits.flatMap((wait) => wait.rows ?? []),
        ...printed,
        ...(question ? askedRows(question) : []),
      ],
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

    return layoutScreen(shown, { columns: columns(), look, mascot, spinner, final, ...fit });
  };

  const momentNow = (now: number, emotion: Emotion): MascotMoment => {
    life.feel(emotion, now);
    const moment = life.frame(now);
    if (moment.settled) {
      settled?.();
    }

    return host.animate ? moment : { face: restingFace(emotion), still: true, settled: true };
  };

  /**
   * The last frame goes, and the screen as it stands now is printed once instead: a wait's link or code to
   * scan that no longer fits in place is still there to read.
   */
  const giveUpDrawing = () => {
    if (painted.length > 0) {
      writeOut(`${BEGIN_FRAME}${CSI}${heightOf(painted, columns())}F${CSI}J${END_FRAME}`);
    }
    painted = [];
    stopDrawingInPlace();
    snapshot();
    if (asked) {
      echoAnswer(asked);
    }
  };

  /** Keeps an answer in sight once nothing is drawn in place: it is written on a line of its own, over itself. */
  const echoAnswer = ({ prompt, secret, suffix = '', display, answer }: Asked) => {
    const shown = secret ? answer && HIDDEN_ANSWER : display ? display(answer) : answer;

    writeOut(`\r${CSI}K${prompt}${shown}${suffix}`);
  };

  /** Draws the screen as it is now, in place. Gives up drawing in place where it no longer fits. */
  const draw = () => {
    const now = host.now();
    const shown = view();
    const moment = momentNow(now, shown.emotion);
    const fit = fitScreen(shown, size());
    if (!fit) {
      giveUpDrawing();

      return;
    }

    const lines = linesFor(shown, fit, moment, now, false);
    writeOut(repaint(painted, lines, columns()));
    painted = lines;
  };

  const tick = () => {
    if (!finished && live) {
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
    const text = layoutScreen(view(null), { columns: columns(), look, spinner: STILL_SPINNER, final: true })
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

  /** The screen as it is left at the end: the mascot's still face for `emotion`, as large as fits. */
  const finalLines = (emotion: Emotion) => {
    const shown = view(null);
    // Where the terminal doesn't say how tall it is, the screen is printed once and may take what it needs.
    const height = out.rows || Number.MAX_SAFE_INTEGER;
    const fit = fitScreen(shown, { columns: columns(), rows: height, aspect, final: true }) ?? {
      compact: false,
      hiddenRows: 0,
    };

    return linesFor(shown, fit, { face: restingFace(emotion), still: true, settled: true }, host.now(), true);
  };

  const changed = () => {
    if (finished) {
      return;
    }
    if (!paintQueued) {
      paintQueued = true;
      queueMicrotask(() => {
        paintQueued = false;
        tick();
      });
    }
  };

  /** Asks on the screen: the answer is read from the terminal and drawn here as it is typed. */
  const askOnScreen = async (question: Asked, options: AskOptions): Promise<string> => {
    let checking: ReturnType<typeof setTimeout> | undefined;

    const check = () => {
      const { answer } = question;
      clearTimeout(checking);
      question.note = options.check && answer.trim() ? CHECKING : undefined;
      if (!question.note) {
        return;
      }

      checking = setTimeout(async () => {
        const note = await options.check?.(answer).catch(() => undefined);
        if (asked === question && question.answer === answer) {
          question.note = note;
          changed();
        }
      }, CHECK_AFTER_MS);
    };

    asked = question;
    changed();

    try {
      return await host.read({
        initial: options.initial,
        onChange: (answer, cursor) => {
          const edited = answer !== question.answer;
          question.answer = answer;
          question.cursor = cursor;
          question.typedAt = host.now();
          if (edited) {
            check();
          }
          if (live) {
            changed();
          } else {
            echoAnswer(question);
          }
        },
      });
    } finally {
      clearTimeout(checking);
      asked = null;
      if (!live) {
        writeOut('\n');
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
      if (finished || !live) {
        return passOn(chunk, rest);
      }

      absorb(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());
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
    printed = [];
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
      leave(feeling);
    }
  });

  const end = async (emotion: Emotion) => {
    if (finished) {
      return;
    }

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

      if (!live) {
        snapshot();
        writeOut(text);

        return;
      }

      for (const line of text.split('\n').map((part) => part.trimEnd())) {
        if (line && printed[printed.length - 1]?.value !== line) {
          printed.push({ value: line });
        }
      }
      changed();
    },
    ask: async (question, options: AskOptions = {}) => {
      const { secret = false, remember, initial = '', suffix, display, note, check } = options;
      const askPlainly = () => askOffering(question, options, (words) => host.ask(words, secret));
      if (finished) {
        return askPlainly();
      }

      finishActivity('done');
      moveOn(question);
      asking = true;
      const above = question.split('\n');
      const prompt = above.pop() ?? '';
      const onScreen: Asked = {
        above: above.filter((line) => line.trim()),
        prompt,
        secret,
        suffix,
        display,
        answer: initial,
        cursor: initial.length,
        typedAt: host.now(),
        noted: Boolean(check),
        note,
      };
      let answer: string;
      try {
        if (live && !fitScreen(view(onScreen), size())) {
          giveUpDrawing();
        }
        if (live) {
          answer = await askOnScreen(onScreen, options);
        } else {
          snapshot();
          answer = await askPlainly();
        }
      } finally {
        asking = false;
      }

      const row = remember
        ? remember(answer)
        : answer.trim()
          ? { mark: 'done' as const, value: `${prompt.trim()} ${secret ? HIDDEN_ANSWER : answer.trim()}` }
          : undefined;
      if (row) {
        rows.push(row);
      }
      lastAsked = { question, row, printed: printed.length };
      // The next question may be on its way, which decides what stays. Without one, what came with this goes.
      host.later(() => {
        if (!asking && !finished) {
          printed = [];
          if (lastAsked) {
            lastAsked.printed = 0;
          }
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

  /**
   * The same question asked again means the answer wasn't right: it leaves the list, this question taking its
   * place, and what came with the question stays. Any other question leaves what came with the last one behind.
   */
  const moveOn = (question: string) => {
    if (lastAsked?.question !== question) {
      printed = printed.slice(lastAsked?.printed ?? 0);
    } else if (rows[rows.length - 1] === lastAsked.row) {
      rows.pop();
    }
    lastAsked = undefined;
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
