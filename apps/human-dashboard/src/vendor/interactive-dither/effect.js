//#region src/dither/dither-algorithms.ts
var BAYER_8X8 = new Uint8Array([
	0,
	48,
	12,
	60,
	3,
	51,
	15,
	63,
	32,
	16,
	44,
	28,
	35,
	19,
	47,
	31,
	8,
	56,
	4,
	52,
	11,
	59,
	7,
	55,
	40,
	24,
	36,
	20,
	43,
	27,
	39,
	23,
	2,
	50,
	14,
	62,
	1,
	49,
	13,
	61,
	34,
	18,
	46,
	30,
	33,
	17,
	45,
	29,
	10,
	58,
	6,
	54,
	9,
	57,
	5,
	53,
	42,
	26,
	38,
	22,
	41,
	25,
	37,
	21
]);
var clampByte = (value) => Math.max(0, Math.min(255, value));
function createSeededRandom(seed = 1831565813) {
	let state = seed >>> 0;
	return () => {
		state += 1831565813;
		let value = state;
		value = Math.imul(value ^ value >>> 15, value | 1);
		value ^= value + Math.imul(value ^ value >>> 7, value | 61);
		return ((value ^ value >>> 14) >>> 0) / 4294967296;
	};
}
function sampleCover(source, targetWidth, targetHeight) {
	const width = Math.max(1, Math.floor(targetWidth));
	const height = Math.max(1, Math.floor(targetHeight));
	const result = new Uint8ClampedArray(width * height * 4);
	const scale = Math.max(width / source.width, height / source.height);
	const cropX = (source.width - width / scale) / 2;
	const cropY = (source.height - height / scale) / 2;
	for (let y = 0; y < height; y += 1) {
		const sourceY = Math.min(source.height - 1, Math.max(0, Math.floor(cropY + (y + .5) / scale)));
		for (let x = 0; x < width; x += 1) {
			const sourceX = Math.min(source.width - 1, Math.max(0, Math.floor(cropX + (x + .5) / scale)));
			const from = (sourceY * source.width + sourceX) * 4;
			result.set(source.data.subarray(from, from + 4), (y * width + x) * 4);
		}
	}
	return {
		data: result,
		height,
		width
	};
}
function rasterToLuminance(source) {
	const luminance = new Float32Array(source.width * source.height);
	for (let index = 0; index < luminance.length; index += 1) {
		const offset = index * 4;
		const alpha = source.data[offset + 3] / 255;
		const value = source.data[offset] * .2126 + source.data[offset + 1] * .7152 + source.data[offset + 2] * .0722;
		luminance[index] = value * alpha + 255 * (1 - alpha);
	}
	return luminance;
}
function boxBlur(input, width, height, radius) {
	const r = Math.max(0, Math.round(radius));
	if (r === 0) return input.slice();
	const horizontal = new Float32Array(input.length);
	const output = new Float32Array(input.length);
	for (let y = 0; y < height; y += 1) {
		let sum = 0;
		for (let x = -r; x <= r; x += 1) sum += input[y * width + Math.max(0, Math.min(width - 1, x))];
		for (let x = 0; x < width; x += 1) {
			horizontal[y * width + x] = sum / (r * 2 + 1);
			sum += input[y * width + Math.min(width - 1, x + r + 1)] - input[y * width + Math.max(0, x - r)];
		}
	}
	for (let x = 0; x < width; x += 1) {
		let sum = 0;
		for (let y = -r; y <= r; y += 1) sum += horizontal[Math.max(0, Math.min(height - 1, y)) * width + x];
		for (let y = 0; y < height; y += 1) {
			output[y * width + x] = sum / (r * 2 + 1);
			sum += horizontal[Math.min(height - 1, y + r + 1) * width + x] - horizontal[Math.max(0, y - r) * width + x];
		}
	}
	return output;
}
function preprocessLuminance(input, width, height, settings) {
	const blurred = boxBlur(input, width, height, settings.blur);
	const result = new Float32Array(blurred.length);
	const random = createSeededRandom(settings.seed);
	const black = clampByte(settings.blackPoint);
	const white = Math.max(black + 1, clampByte(settings.whitePoint));
	const gamma = Math.max(.01, settings.gamma);
	const grain = Math.max(0, settings.grain) * 255;
	for (let index = 0; index < blurred.length; index += 1) {
		const withGrain = blurred[index] + (random() * 2 - 1) * grain;
		const normalized = Math.max(0, Math.min(1, (withGrain - black) / (white - black)));
		result[index] = clampByte(Math.pow(normalized, 1 / gamma) * 255);
	}
	return result;
}
function ditherLuminance(input, width, height, settings) {
	const threshold = clampByte(settings.threshold);
	const output = new Uint8Array(input.length);
	const random = createSeededRandom(settings.seed);
	if (settings.algorithm === "floyd-steinberg") {
		const working = input.slice();
		for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
			const index = y * width + x;
			const quantized = working[index] >= threshold ? 255 : 0;
			output[index] = settings.invert ? 255 - quantized : quantized;
			const error = working[index] - quantized;
			if (x + 1 < width) working[index + 1] += error * (7 / 16);
			if (y + 1 < height) {
				if (x > 0) working[index + width - 1] += error * (3 / 16);
				working[index + width] += error * (5 / 16);
				if (x + 1 < width) working[index + width + 1] += error * (1 / 16);
			}
		}
		return output;
	}
	for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
		const index = y * width + x;
		const localThreshold = settings.algorithm === "bayer" ? clampByte(threshold + (BAYER_8X8[y % 8 * 8 + x % 8] - 31.5) * 4) : clampByte(threshold + (random() - .5) * 255);
		const quantized = input[index] >= localThreshold ? 255 : 0;
		output[index] = settings.invert ? 255 - quantized : quantized;
	}
	return output;
}
function assertDitherWorkload(input) {
	if ((input.sourceWidth ?? 0) * (input.sourceHeight ?? 0) > 67108864) throw new Error("Source exceeds 67,108,864 pixels. Import a smaller image to continue.");
	if ((input.previewWidth ?? 0) * (input.previewHeight ?? 0) > 67108864) throw new Error("Preview exceeds 67,108,864 pixels. Reduce scene dimensions or Resolution scale to continue.");
	if ((input.pinCount ?? 0) > 32) throw new Error("This scene supports up to 32 pins. Remove extra pins to resume rendering.");
}
//#endregion
//#region src/dither/dither-flicker.ts
var clamp$1 = (v) => Math.max(0, Math.min(1, v));
var smooth = (v) => {
	const t = clamp$1(v);
	return t * t * (3 - 2 * t);
};
function random(seed) {
	let n = Math.imul(seed ^ seed >>> 16, 73244475);
	n = Math.imul(n ^ n >>> 16, 73244475);
	return ((n ^ n >>> 16) >>> 0) / 4294967295;
}
function track(seed, phase, cycles) {
	const t = phase * cycles;
	const frame = Math.floor(t);
	const a = random(seed + frame % cycles * 374761393);
	return a + (random(seed + (frame + 1) % cycles * 374761393) - a) * smooth(t - frame);
}
function particleFlicker(x, y, progress, speed) {
	const seed = Math.imul(Math.round(x * 32), 73856093) ^ Math.imul(Math.round(y * 32), 19349663);
	const phase = (progress % 1 + 1) % 1;
	const rate = Math.max(1, speed * (5 + random(seed ^ 5370206) * 5));
	const low = Math.floor(rate);
	return smooth((track(seed, phase, low) * (1 - (rate - low)) + track(seed, phase, low + 1) * (rate - low) - .2) / .6);
}
function pointerEnvelope(distance, radius, softness) {
	const normalized = distance / Math.max(1, radius);
	if (normalized >= 1) return 0;
	const edge = Math.max(.02, clamp$1(softness));
	return 1 - smooth((normalized - (1 - edge)) / edge);
}
//#endregion
//#region src/dither/pin-animation.ts
var clamp01$1 = (v) => Math.max(0, Math.min(1, v));
/** Pin-local coordinates keep the same noise at every preview/export backing scale. */
function samplePin(x, y, progress, pin) {
	const dx = x - pin.position.x, dy = y - pin.position.y;
	const distance = Math.hypot(dx, dy);
	if (pin.radius <= 0 || distance >= pin.radius) return {
		weight: 0,
		offsetX: 0,
		offsetY: 0
	};
	const r = distance / pin.radius;
	const edge = pin.softness === 0 ? 1 : pointerEnvelope(distance, pin.radius, pin.softness);
	const nx = dx / pin.radius * 128, ny = dy / pin.radius * 128;
	const phase = pin.speed === 0 ? 0 : progress;
	const speed = Math.max(.1, pin.speed);
	const noise = particleFlicker(nx, ny, phase, speed);
	const weight = edge * clamp01$1(pin.coverage + (noise - .5) * 2 * pin.noise);
	const spread = pin.scatter * pin.radius * .7 * r * r * r * edge;
	return {
		weight,
		offsetX: spread === 0 ? 0 : spread * (2 * particleFlicker(nx + 413, ny - 179, phase, speed * .7) - 1),
		offsetY: spread === 0 ? 0 : spread * (2 * particleFlicker(nx - 271, ny + 593, phase, speed * .7) - 1)
	};
}
//#endregion
//#region src/dither/dither-renderer.ts
var TAU = Math.PI * 2;
var clamp01 = (value) => Math.max(0, Math.min(1, value));
function buildToneField(options) {
	const width = options.source.width;
	const height = options.source.height;
	return {
		height,
		tone: preprocessLuminance(rasterToLuminance(options.source), width, height, options.tone),
		width
	};
}
function buildDitherField(toneField, targetWidth, targetHeight, pixelSize, dither) {
	const resolvedPixelSize = Math.max(1, Math.round(pixelSize));
	const width = Math.max(1, Math.ceil(targetWidth / resolvedPixelSize));
	const height = Math.max(1, Math.ceil(targetHeight / resolvedPixelSize));
	const sourcePixels = new Uint8ClampedArray(toneField.tone.length * 4);
	for (let index = 0; index < toneField.tone.length; index += 1) {
		const value = toneField.tone[index];
		sourcePixels.set([
			value,
			value,
			value,
			255
		], index * 4);
	}
	const tone = rasterToLuminance(sampleCover({
		data: sourcePixels,
		height: toneField.height,
		width: toneField.width
	}, width, height));
	return {
		height,
		mask: ditherLuminance(tone, width, height, dither),
		inverted: dither.invert,
		pixelSize: resolvedPixelSize,
		tone,
		width
	};
}
function buildStaticDitherField(options) {
	return buildDitherField(buildToneField(options), options.targetWidth, options.targetHeight, options.pixelSize, options.dither);
}
function parseHexColor(value) {
	const match = /^#([0-9a-f]{6})$/i.exec(value);
	if (!match) return [
		255,
		255,
		255
	];
	return [
		Number.parseInt(match[1].slice(0, 2), 16),
		Number.parseInt(match[1].slice(2, 4), 16),
		Number.parseInt(match[1].slice(4, 6), 16)
	];
}
function getDynamicCell(sceneX, sceneY, settings) {
	const progress = (settings.timelineProgress % 1 + 1) % 1;
	let scale = settings.breathingEnabled ? 1 + Math.sin(progress * TAU) * settings.breathingAmount : 1;
	let color = parseHexColor(settings.ink);
	let opacity = settings.flickerEnabled ? 1 - clamp01(settings.flickerAmount) * (1 - particleFlicker(sceneX, sceneY, progress, settings.flickerSpeed)) : 1;
	let offsetX = 0, offsetY = 0;
	for (const pin of settings.pins) {
		const sample = samplePin(sceneX, sceneY, progress, pin);
		offsetX += sample.offsetX;
		offsetY += sample.offsetY;
		if (sample.weight === 0) continue;
		const accent = parseHexColor(pin.color);
		color = [
			0,
			1,
			2
		].map((i) => Math.round(color[i] + (accent[i] - color[i]) * sample.weight));
		opacity += (1 - opacity) * sample.weight;
	}
	return {
		color,
		scale: Math.max(.08, scale),
		opacity,
		offsetX,
		offsetY,
		reveal: 0
	};
}
function renderDitherFrame(context, field, width, height, settings, clear = true, offsets) {
	if (clear) context.clearRect(0, 0, width, height);
	if (settings.includeBackground) {
		context.fillStyle = settings.background;
		context.fillRect(0, 0, width, height);
	}
	const cellWidth = width / field.width;
	const cellHeight = height / field.height;
	const originalAlpha = context.globalAlpha ?? 1;
	for (let y = 0; y < field.height; y += 1) for (let x = 0; x < field.width; x += 1) {
		const index = y * field.width + x;
		const centerX = (x + .5) * cellWidth;
		const centerY = (y + .5) * cellHeight;
		if (field.mask[index] === 0) continue;
		const dynamic = getDynamicCell(centerX, centerY, settings);
		const offset = offsets?.get(index);
		const drawWidth = Math.max(1, cellWidth * .82 * dynamic.scale);
		const drawHeight = Math.max(1, cellHeight * .82 * dynamic.scale);
		context.fillStyle = `rgb(${dynamic.color[0]} ${dynamic.color[1]} ${dynamic.color[2]})`;
		context.globalAlpha = originalAlpha * dynamic.opacity;
		context.fillRect(centerX + (offset?.x ?? 0) + dynamic.offsetX - drawWidth / 2, centerY + (offset?.y ?? 0) + dynamic.offsetY - drawHeight / 2, drawWidth, drawHeight);
	}
	context.globalAlpha = originalAlpha;
}
function decodeImageElement(image) {
	const width = image.naturalWidth;
	const height = image.naturalHeight;
	assertDitherWorkload({
		sourceWidth: width,
		sourceHeight: height
	});
	if (width <= 0 || height <= 0) throw new Error("Source image has no decodable pixels.");
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) throw new Error("Canvas 2D is unavailable.");
	context.drawImage(image, 0, 0);
	const imageData = context.getImageData(0, 0, width, height);
	canvas.width = 0;
	canvas.height = 0;
	return {
		data: imageData.data.slice(),
		height,
		width
	};
}
//#endregion
//#region src/dither/pointer-physics.ts
var clamp = (x, min, max) => Math.max(min, Math.min(max, x));
/** Reference force law, expressed as one fixed 1/60-second integration step. */
function stepCell(p, homeX, homeY, mouse) {
	const dx = homeX + p.x - mouse.x, dy = homeY + p.y - mouse.y;
	const distance = Math.hypot(dx, dy);
	if (mouse.active && distance > 0 && distance < mouse.radius) {
		if (distance < mouse.repelRadius) {
			const force = (1 - distance / mouse.repelRadius) * mouse.repelForce * mouse.repelRadius * .15 / distance;
			p.vx += dx * force;
			p.vy += dy * force;
		} else if (mouse.radius > mouse.repelRadius) {
			const force = (1 - (distance - mouse.repelRadius) / (mouse.radius - mouse.repelRadius)) * mouse.attractForce * (mouse.radius - mouse.repelRadius) * .08 / distance;
			p.vx -= dx * force;
			p.vy -= dy * force;
		}
	}
	const ease = Math.pow(Math.min(1, Math.hypot(p.x, p.y) / 300), 3);
	const homeForce = mouse.returnSpeed + ease * .12;
	const damping = clamp(mouse.damping - ease * .08, .7, .98);
	p.vx = (p.vx - p.x * homeForce) * damping;
	p.vy = (p.vy - p.y * homeForce) * damping;
	p.x += p.vx;
	p.y += p.vy;
}
/** Sparse state contains only displaced lit cells; rest is the unchanged dither mask. */
var PointerSimulation = class {
	mask;
	columns;
	rows;
	width;
	height;
	cells = /* @__PURE__ */ new Map();
	remainder = 0;
	constructor(mask, columns, rows, width, height) {
		this.mask = mask;
		this.columns = columns;
		this.rows = rows;
		this.width = width;
		this.height = height;
	}
	clear() {
		this.cells.clear();
		this.remainder = 0;
	}
	advance(seconds, pointer) {
		this.remainder += clamp(seconds, 0, .1);
		const cw = this.width / this.columns, ch = this.height / this.rows;
		while (this.remainder + 1e-9 >= 1 / 60) {
			this.remainder -= 1 / 60;
			if (pointer.active && (pointer.repelForce > 0 || pointer.attractForce > 0)) {
				const left = Math.max(0, Math.floor((pointer.x - pointer.radius) / cw)), right = Math.min(this.columns - 1, Math.ceil((pointer.x + pointer.radius) / cw));
				const top = Math.max(0, Math.floor((pointer.y - pointer.radius) / ch)), bottom = Math.min(this.rows - 1, Math.ceil((pointer.y + pointer.radius) / ch));
				for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
					const index = y * this.columns + x;
					if (this.mask[index] && !this.cells.has(index) && Math.hypot((x + .5) * cw - pointer.x, (y + .5) * ch - pointer.y) < pointer.radius) this.cells.set(index, {
						x: 0,
						y: 0,
						vx: 0,
						vy: 0
					});
				}
			}
			for (const [index, cell] of this.cells) {
				stepCell(cell, (index % this.columns + .5) * cw, (Math.floor(index / this.columns) + .5) * ch, pointer);
				if (Math.abs(cell.x) + Math.abs(cell.y) + Math.abs(cell.vx) + Math.abs(cell.vy) < .002) this.cells.delete(index);
			}
		}
	}
};
//#endregion
//#region src/dither/dither-settings.ts
var numberValue = (value, fallback) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
var booleanValue = (value, fallback) => typeof value === "boolean" ? value : fallback;
var stringValue = (value, fallback) => typeof value === "string" ? value : fallback;
function getDitherBackingSize(width, height, devicePixelRatio, renderScale) {
	return {
		width: Math.max(1, Math.round(width * devicePixelRatio * renderScale)),
		height: Math.max(1, Math.round(height * devicePixelRatio * renderScale))
	};
}
function parsePins(value, width, height, backingScale) {
	if (!Array.isArray(value)) return [];
	return value.flatMap((candidate) => {
		if (!candidate || typeof candidate !== "object") return [];
		const pin = candidate;
		const position = pin.position && typeof pin.position === "object" ? pin.position : {};
		const axis = (value) => Math.max(-1, Math.min(1, Number.parseFloat(String(value)) || 0));
		return [{
			radius: numberValue(pin.radius, 100) * Math.max(0, backingScale),
			color: stringValue(pin.color, "#FF4F2E"),
			position: {
				x: (axis(position.x) + 1) * width / 2,
				y: (axis(position.y) + 1) * height / 2
			},
			coverage: Math.max(0, Math.min(1, numberValue(pin.coverage, .55))),
			noise: Math.max(0, Math.min(1, numberValue(pin.noise, .85))),
			speed: Math.max(0, Math.min(4, numberValue(pin.speed, 1))),
			softness: Math.max(0, Math.min(1, numberValue(pin.softness, .25))),
			scatter: Math.max(0, Math.min(1, numberValue(pin.scatter, .2)))
		}];
	});
}
function readToneSettings(values) {
	return {
		blackPoint: numberValue(values["tone.blackPoint"], 0),
		blur: numberValue(values["tone.blur"], 0),
		gamma: numberValue(values["tone.gamma"], 2),
		grain: numberValue(values["tone.grain"], .07),
		seed: 5370206,
		whitePoint: numberValue(values["tone.whitePoint"], 251)
	};
}
function readDitherSettings(values) {
	return {
		algorithm: stringValue(values["dither.algorithm"], "floyd-steinberg"),
		invert: booleanValue(values["dither.invert"], false),
		seed: 858083,
		threshold: numberValue(values["dither.threshold"], 128)
	};
}
var idleDitherPointer = Object.freeze({
	active: false,
	energy: 0,
	x: 0,
	y: 0
});
function readDynamicSettings(values, width, height, timelineProgress, includeBackground, pointer = idleDitherPointer) {
	return {
		background: stringValue(values["appearance.background"], "#0A0A0A"),
		breathingAmount: numberValue(values["motion.breathing.amount"], .08),
		breathingEnabled: booleanValue(values["motion.breathing.enabled"], true),
		includeBackground,
		ink: stringValue(values["dither.ink"], "#F4F1EA"),
		pins: parsePins(values["pins.items"], width, height, 1),
		pointer: {
			active: booleanValue(values["pointer.enabled"], true) && pointer.active,
			radius: numberValue(values["pointer.radius"], 85),
			x: pointer.x,
			y: pointer.y,
			repelRadius: numberValue(values["pointer.repelRadius"], 200),
			repelForce: numberValue(values["pointer.repelForce"], 1.2),
			attractForce: numberValue(values["pointer.attractForce"], .06),
			returnSpeed: numberValue(values["pointer.return"], .008),
			damping: numberValue(values["pointer.damping"], .92)
		},
		flickerAmount: numberValue(values["motion.flicker.amount"], .65),
		flickerEnabled: booleanValue(values["motion.flicker.enabled"], true),
		flickerSpeed: numberValue(values["motion.flicker.speed"], 1),
		timelineProgress
	};
}
function transformSourcePixels(source, transform) {
	const turns = (transform?.rotationDeg ?? 0) / 90;
	if (!turns && !transform?.flipHorizontal && !transform?.flipVertical) return source;
	const width = turns % 2 ? source.height : source.width;
	const height = turns % 2 ? source.width : source.height;
	const data = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
		const fx = transform?.flipHorizontal ? source.width - 1 - x : x;
		const fy = transform?.flipVertical ? source.height - 1 - y : y;
		const dx = turns === 1 ? source.height - 1 - fy : turns === 2 ? source.width - 1 - fx : turns === 3 ? fy : fx;
		const dy = turns === 1 ? fx : turns === 2 ? source.height - 1 - fy : turns === 3 ? source.width - 1 - fx : fy;
		data.set(source.data.subarray((y * source.width + x) * 4, (y * source.width + x) * 4 + 4), (dy * width + dx) * 4);
	}
	return {
		data,
		width,
		height
	};
}
//#endregion
//#region src/export-config/settings.ts
var effectValueTargets = [
	"tone.blackPoint",
	"tone.blur",
	"tone.gamma",
	"tone.grain",
	"tone.whitePoint",
	"dither.algorithm",
	"dither.invert",
	"dither.threshold",
	"dither.pixelSize",
	"dither.ink",
	"appearance.background",
	"motion.breathing.amount",
	"motion.breathing.enabled",
	"motion.flicker.amount",
	"motion.flicker.enabled",
	"motion.flicker.speed",
	"pointer.enabled",
	"pointer.radius",
	"pointer.repelRadius",
	"pointer.repelForce",
	"pointer.attractForce",
	"pointer.return",
	"pointer.damping",
	"pins.items"
];
function validateEffectSettings(input) {
	if (!input || typeof input !== "object") throw new Error("Missing effect settings.");
	const s = structuredClone(input);
	if (s.format !== "interactive-dither" || s.version !== 1) throw new Error("Unsupported effect settings version.");
	if (!/^image\.(png|jpg)$/.test(s.image)) throw new Error("Unsupported source image.");
	for (const r of [s.scene, s.output]) {
		if (!r || ![
			r.x,
			r.y,
			r.width,
			r.height
		].every(Number.isFinite) || r.width <= 0 || r.height <= 0 || r.width > 8192 || r.height > 8192) throw new Error("Invalid effect dimensions.");
		assertDitherWorkload({
			previewWidth: r.width,
			previewHeight: r.height
		});
	}
	if (!s.playback || !Number.isFinite(s.playback.durationSeconds) || s.playback.durationSeconds <= 0 || !Number.isFinite(s.playback.initialTimeSeconds) || s.playback.initialTimeSeconds < 0 || s.playback.initialTimeSeconds > s.playback.durationSeconds || typeof s.playback.loop !== "boolean") throw new Error("Invalid playback settings.");
	if (!s.transform || ![
		0,
		90,
		180,
		270
	].includes(s.transform.rotationDeg ?? 0) || [s.transform.flipHorizontal, s.transform.flipVertical].some((v) => v !== void 0 && typeof v !== "boolean")) throw new Error("Invalid image transform.");
	if (typeof s.includeBackground !== "boolean" || !Number.isFinite(s.renderScale) || s.renderScale < 1 || s.renderScale > 2) throw new Error("Invalid render quality.");
	if (!s.values || typeof s.values !== "object" || Array.isArray(s.values)) throw new Error("Invalid effect values.");
	const v = s.values;
	for (const key of Object.keys(v)) if (!effectValueTargets.includes(key)) throw new Error("Unknown effect setting: " + key);
	for (const [key, [min, max]] of Object.entries({
		"tone.blackPoint": [0, 255],
		"tone.whitePoint": [0, 255],
		"tone.blur": [0, 32],
		"tone.gamma": [.01, 10],
		"tone.grain": [0, 1],
		"dither.threshold": [0, 255],
		"dither.pixelSize": [1, 128],
		"motion.breathing.amount": [0, 1],
		"motion.flicker.amount": [0, 1],
		"motion.flicker.speed": [0, 20],
		"pointer.radius": [0, 600],
		"pointer.repelRadius": [0, 600],
		"pointer.repelForce": [0, 3],
		"pointer.attractForce": [0, .5],
		"pointer.return": [.002, .04],
		"pointer.damping": [.8, .98]
	})) if (typeof v[key] !== "number" || !Number.isFinite(v[key]) || v[key] < min || v[key] > max) throw new Error("Invalid effect value: " + key);
	for (const key of [
		"dither.invert",
		"motion.breathing.enabled",
		"motion.flicker.enabled",
		"pointer.enabled"
	]) if (typeof v[key] !== "boolean") throw new Error("Invalid switch: " + key);
	for (const key of ["dither.ink", "appearance.background"]) if (!/^#[0-9A-Fa-f]{6}$/.test(String(v[key]))) throw new Error("Invalid color: " + key);
	if (![
		"floyd-steinberg",
		"bayer",
		"random"
	].includes(String(v["dither.algorithm"]))) throw new Error("Invalid dither algorithm.");
	if (!Array.isArray(v["pins.items"])) throw new Error("Invalid pins.");
	assertDitherWorkload({ pinCount: v["pins.items"].length });
	for (const pin of v["pins.items"]) {
		if (!pin || typeof pin !== "object" || !pin.position || !/^#[0-9a-f]{6}$/i.test(pin.color)) throw new Error("Invalid pin.");
		for (const axis of ["x", "y"]) if (!Number.isFinite(Number(pin.position[axis])) || Math.abs(Number(pin.position[axis])) > 1) throw new Error("Invalid pin position.");
		for (const [key, max] of [
			["radius", 600],
			["coverage", 1],
			["noise", 1],
			["speed", 4],
			["softness", 1],
			["scatter", 1]
		]) if (typeof pin[key] !== "number" || !Number.isFinite(pin[key]) || pin[key] < 0 || pin[key] > max) throw new Error("Invalid pin " + key);
	}
	return s;
}
//#endregion
//#region src/export-config/player.ts
/** Mount one independent effect. Logical scene geometry stays fixed as the container resizes. */
async function createDitherEffect(options) {
	const settings = validateEffectSettings(options.settings);
	const { scene, output, values } = settings;
	options.signal?.throwIfAborted();
	const image = new Image();
	image.crossOrigin = "anonymous";
	const abortImage = () => {
		image.src = "";
	};
	options.signal?.addEventListener("abort", abortImage, { once: true });
	try {
		image.src = options.imageUrl ?? settings.image;
		await image.decode();
		options.signal?.throwIfAborted();
	} finally {
		options.signal?.removeEventListener("abort", abortImage);
	}
	const field = buildStaticDitherField({
		source: transformSourcePixels(decodeImageElement(image), settings.transform),
		targetWidth: scene.width,
		targetHeight: scene.height,
		pixelSize: values["dither.pixelSize"],
		tone: readToneSettings(values),
		dither: readDitherSettings(values)
	});
	const sim = new PointerSimulation(field.mask, field.width, field.height, scene.width, scene.height);
	const canvas = document.createElement("canvas");
	canvas.setAttribute("aria-label", "Interactive dither effect");
	canvas.dataset.ditherEffect = "";
	canvas.style.display = "block";
	canvas.style.width = "100%";
	canvas.style.aspectRatio = output.width + " / " + output.height;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("Canvas 2D is unavailable.");
	let destroyed = false, frame = 0, previous = 0, lastPaint = 0, dirty = true;
	let playing = options.autoplay !== false;
	let time = settings.playback.initialTimeSeconds;
	let pointer = idleDitherPointer;
	let intersecting = true;
	let error = null;
	const motion = matchMedia("(prefers-reduced-motion: reduce)");
	const controller = new AbortController();
	function assertLive() {
		if (destroyed) throw new Error("Effect has been destroyed.");
	}
	function resize() {
		assertLive();
		const width = canvas.getBoundingClientRect().width;
		if (width <= 0) return;
		const backing = getDitherBackingSize(width, width * output.height / output.width, devicePixelRatio || 1, settings.renderScale);
		assertDitherWorkload({
			previewWidth: backing.width,
			previewHeight: backing.height
		});
		if (canvas.width !== backing.width) canvas.width = backing.width;
		if (canvas.height !== backing.height) canvas.height = backing.height;
		dirty = true;
	}
	function paint() {
		context.setTransform(canvas.width / output.width, 0, 0, canvas.height / output.height, 0, 0);
		context.clearRect(0, 0, output.width, output.height);
		if (settings.includeBackground) {
			context.fillStyle = values["appearance.background"];
			context.fillRect(0, 0, output.width, output.height);
		}
		context.save();
		context.translate(scene.x - output.x, scene.y - output.y);
		context.beginPath();
		context.rect(0, 0, scene.width, scene.height);
		context.clip();
		const progress = motion.matches ? 0 : time / settings.playback.durationSeconds;
		renderDitherFrame(context, field, scene.width, scene.height, readDynamicSettings(values, scene.width, scene.height, progress, false, pointer), false, sim.cells);
		context.restore();
		dirty = false;
	}
	function fail(cause) {
		error = cause instanceof Error ? cause : new Error(String(cause));
		playing = false;
		cancelAnimationFrame(frame);
		frame = 0;
		canvas.dispatchEvent(new CustomEvent("dither-error", {
			detail: error,
			bubbles: true
		}));
	}
	function visible() {
		return !document.hidden && intersecting;
	}
	function tick(now) {
		frame = 0;
		if (destroyed || !visible() || error) return;
		const dt = previous ? (now - previous) / 1e3 : 1 / 60;
		if (now - lastPaint >= 1e3 / 30) {
			previous = now;
			if (playing && !motion.matches) {
				time += dt;
				if (settings.playback.loop) time %= settings.playback.durationSeconds;
				else if (time >= settings.playback.durationSeconds) {
					time = settings.playback.durationSeconds;
					playing = false;
				}
				dirty = true;
			}
			if (!motion.matches && (pointer.active || sim.cells.size)) {
				sim.advance(dt, readDynamicSettings(values, scene.width, scene.height, 0, false, pointer).pointer);
				dirty = true;
			}
			try {
				resize();
				if (dirty) paint();
			} catch (cause) {
				fail(cause);
				return;
			}
			lastPaint = now;
		}
		if (playing && !motion.matches || pointer.active || sim.cells.size || dirty) schedule();
	}
	function schedule() {
		if (!frame && !destroyed && visible() && !error) frame = requestAnimationFrame(tick);
	}
	function leave() {
		pointer = idleDitherPointer;
		schedule();
	}
	function onPointer(event) {
		if (!values["pointer.enabled"] || motion.matches || event.buttons !== 0) {
			leave();
			return;
		}
		const box = canvas.getBoundingClientRect();
		pointer = {
			active: true,
			energy: 1,
			x: (event.clientX - box.left) * output.width / Math.max(1, box.width) + output.x - scene.x,
			y: (event.clientY - box.top) * output.height / Math.max(1, box.height) + output.y - scene.y
		};
		if (!frame) previous = 0;
		schedule();
	}
	function visibilityChanged() {
		previous = 0;
		if (!visible()) {
			leave();
			cancelAnimationFrame(frame);
			frame = 0;
		} else {
			dirty = true;
			schedule();
		}
	}
	function motionChanged() {
		pointer = idleDitherPointer;
		sim.clear();
		dirty = true;
		previous = 0;
		schedule();
	}
	const observer = new IntersectionObserver(([entry]) => {
		intersecting = entry.isIntersecting;
		visibilityChanged();
	});
	const resizer = new ResizeObserver(() => {
		try {
			resize();
			schedule();
		} catch (cause) {
			fail(cause);
		}
	});
	function destroy() {
		if (destroyed) return;
		destroyed = true;
		cancelAnimationFrame(frame);
		controller.abort();
		observer.disconnect();
		resizer.disconnect();
		motion.removeEventListener("change", motionChanged);
		options.signal?.removeEventListener("abort", destroy);
		sim.clear();
		canvas.remove();
		canvas.width = 0;
		canvas.height = 0;
	}
	options.container.append(canvas);
	try {
		resize();
		paint();
		canvas.addEventListener("pointermove", onPointer, { signal: controller.signal });
		canvas.addEventListener("pointerleave", leave, { signal: controller.signal });
		canvas.addEventListener("pointercancel", leave, { signal: controller.signal });
		document.addEventListener("visibilitychange", visibilityChanged, { signal: controller.signal });
		window.addEventListener("resize", () => {
			try {
				resize();
				schedule();
			} catch (cause) {
				fail(cause);
			}
		}, { signal: controller.signal });
		motion.addEventListener("change", motionChanged);
		observer.observe(canvas);
		resizer.observe(canvas);
		options.signal?.addEventListener("abort", destroy, { once: true });
		options.signal?.throwIfAborted();
		schedule();
	} catch (cause) {
		destroy();
		throw cause;
	}
	return {
		canvas,
		get currentTime() {
			return time;
		},
		get isPlaying() {
			return playing;
		},
		get error() {
			return error;
		},
		play() {
			assertLive();
			if (time >= settings.playback.durationSeconds) time = 0;
			playing = true;
			previous = 0;
			schedule();
		},
		pause() {
			assertLive();
			playing = false;
		},
		seek(seconds) {
			assertLive();
			if (!Number.isFinite(seconds)) throw new Error("Invalid time.");
			time = Math.max(0, Math.min(settings.playback.durationSeconds, seconds));
			pointer = idleDitherPointer;
			sim.clear();
			dirty = true;
			previous = 0;
			paint();
			schedule();
		},
		resize() {
			resize();
			paint();
		},
		destroy
	};
}
//#endregion
export { createDitherEffect };
