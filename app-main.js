function createSVGNode(tag, attributes) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const key in attributes) {
        node.setAttribute(key, attributes[key]);
    }
    return node;
}

function mod(v, n) {
    return ((v % n) + n) % n;
}

class SceneObject {
    children = new Set();

    addChild(obj) {
        this.children.add(obj);
    }

    play(endFrame) {
        for (const child of this.children) {
            child.play(endFrame);
        }
    }

    cancel() {
        for (const child of this.children) {
            child.cancel();
        }
    }

    reset() {
        for (const child of this.children) {
            child.reset();
        }
    }
}

class Scene extends SceneObject {
    #node = createSVGNode("svg");

    constructor() {
        super();
        document.getElementById("wrapper")?.appendChild(this.#node);
        window.addEventListener("resize", () => this.#resize());
        this.#resize();
    }

    #resize() {
        const imgWidth = 1743;
        const imgHeight = 980;
        const imgAspect = imgWidth / imgHeight;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const screenAspect = screenWidth / screenHeight;
        const scale = screenAspect > imgAspect ? screenWidth / imgWidth : screenHeight / imgHeight;
        const dim = 390 * scale;
        const dx = 172 * scale;
        const dy = -206 * scale;
        this.#node.setAttribute("style", `
            width: ${dim}px;
            height: ${dim}px;
            overflow: visible;
            position: absolute;
            left: calc(50% + ${dx}px);
            top: calc(50% + ${dy}px);
            transform: translate(-50%, -100%);
        `);
    }

    add(obj) {
        super.addChild(obj);
        this.#node.appendChild(obj.node);
        const { x, y, width, height } = this.#node.getBBox();
        this.#node.setAttribute("viewBox", `${x - 10} ${y - 20} ${width + 20} ${height + 20}`);
    }

    clear() {
        this.children.forEach(child => this.#node.removeChild(child.node));
        this.children = new Set();
    }
}

class Beam extends SceneObject {
    #rotation = 0;
    #keyframes = [];
    #animation;

    node;

    get rotation() {
        return this.#rotation;
    }

    set rotation(val) {
        this.#rotation = val;
        this.node.style.transform = `rotate(${-val}rad)`;
    }

    constructor(x, y, width, height, pivotX, pivotY, href) {
        super();

        pivotX =
            pivotX === "center" ? x :
            pivotX ?? 0;
        pivotY =
            pivotY === "bottom" ? y :
            pivotY === "center" ? y + height / 2 :
            pivotY ?? 0;

        this.node = createSVGNode("g", {
            "transform-origin": `${pivotX} ${-pivotY}`,
        });
        this.node.appendChild(createSVGNode("image", {
            x: x - width / 2,
            y: -(y + height),
            width,
            height,
            href,
            preserveAspectRatio: "none",
        }));
    }

    addChild(obj) {
        super.addChild(obj);
        this.node.appendChild(obj.node);
    }

    keyframe_insert(frame, easing = "linear") {
        this.#keyframes.push({ rotation: this.#rotation, frame, easing });
    }

    play(endFrame) {
        super.play(endFrame);

        if (this.#keyframes.length < 1) {
            return;
        }

        const transform = this.#keyframes.map(({ rotation }) => `rotate(${-rotation}rad)`);
        const offset = this.#keyframes.map(({ frame }) => (frame - 1) / (endFrame - 1));
        const easing = this.#keyframes.map(({ easing }) => easing);
        this.#animation = this.node.animate({ transform, offset, easing }, 1000 * endFrame / FRAMES_PER_SECOND);
    }

    cancel() {
        super.cancel();
        this.#animation?.cancel();
        this.#animation = null;
    }

    reset() {
        super.reset();
        this.#rotation = 0;
        this.#keyframes = [];
    }
}

function utf16ToBytes(utf16) {
    return [utf16 >> 8, utf16 & 0xff];
}

function bytesToUtf16(high, low) {
    return (high << 8) + low;
}

function toSurrogates(unicode) {
    const LEAD_OFFSET = 0xD800 - (0x10000 >> 10);
    const lead = LEAD_OFFSET + (unicode >> 10);
    const trail = 0xDC00 + (unicode & 0x3FF);
    return [lead, trail];
}

function fromSurrogates(lead, trail) {
    const SURROGATE_OFFSET = 0x10000 - (0xD800 << 10) - 0xDC00;
    return (lead << 10) + trail + SURROGATE_OFFSET;
}

function isLeadSurrogate(utf16) {
    return (utf16 >> 10) === 0b110110;
}

function isTrailSurrogate(utf16) {
    return (utf16 >> 10) === 0b110111;
}

const verySecretKey = "📲🐁😑🎓🎦🔧🎳👿🍒💸👫🔀👧🌷💂🐽💱👯😝👀😊💇😜🐋😽🐹🍼🐄📶🎨💇🔂😹🏫👝🚲😩🚩😨🕖🐺😊🔛🆖🚊🚽😼🚞😓🍤🛄😹💙🍳";
function toEmoji(str) {
    const keyArray = [...verySecretKey];
    let res = "";
    for (let i = 0; i < str.length; i++) {
        const utf16 = str.charCodeAt(i);
        const [high, low] = utf16ToBytes(utf16);

        const keyChar = keyArray[i % keyArray.length];
        const keyUnicode = keyChar.codePointAt(0);
        const [lead, trail] = toSurrogates(keyUnicode);

        const encodedLead = lead ^ high;
        const encodedTrail = trail ^ low;
        const encodedUnicode = fromSurrogates(encodedLead, encodedTrail);
        const encodedChar = String.fromCodePoint(encodedUnicode);
        res += encodedChar;
    }
    return res;
}

function xorUtf16(str, key, i) {
    const strUtf16 = str.charCodeAt(i);
    const keyUtf16 = key.charCodeAt(i % key.length);
    return strUtf16 ^ keyUtf16;
}

function fromEmoji(str) {
    let res = "";
    for (let i = 0; i < str.length - 1;) {
        const high = xorUtf16(str, verySecretKey, i++);
        const low = xorUtf16(str, verySecretKey, i++);
        const decodedUtf16Lead = bytesToUtf16(high, low);

        let decodedUnicode;
        if (isLeadSurrogate(decodedUtf16Lead)) {
            const high = xorUtf16(str, verySecretKey, i++);
            const low = xorUtf16(str, verySecretKey, i++);
            const decodedUtf16Trail = bytesToUtf16(high, low);
            decodedUnicode = fromSurrogates(decodedUtf16Lead, decodedUtf16Trail);
        } else {
            decodedUnicode = decodedUtf16Lead;
        }

        const decodedChar = String.fromCodePoint(decodedUnicode);
        res += decodedChar;
    }
    return res;
}

function encode(str) {
    return toEmoji(str);
    // return encodeURIComponent(toEmoji(str).toWellFormed());
}

function decode(str) {
    return fromEmoji(str);
    // return fromEmoji(decodeURIComponent(str));
}

// Set up controls
document.getElementById("newMessageButton")?.addEventListener("click", () => {
    document.getElementById("newMessageContainer")?.classList.toggle("sr-only");
});
const newMessageInput = document.getElementById("newMessageInput");
const newMessageDisplay = document.getElementById("newMessageDisplay");
const newMessageCopy = document.getElementById("newMessageCopy");
let newMessageCopyTimeout;
newMessageInput?.addEventListener("input", () => {
    if (newMessageCopyTimeout) {
        clearTimeout(newMessageCopyTimeout);
        newMessageCopy.innerHTML = "📋";
    }
    newMessageDisplay.innerHTML = newMessageInput.value;
});
document.getElementById("newMessageGo")?.addEventListener("click", () => {
    const url = new URL(window.location);
    url.searchParams.set("m", encode(newMessageInput.value));
    window.location = url;
});
newMessageCopy?.addEventListener("click", () => {
    const url = new URL(window.location);
    url.searchParams.set("m", encode(newMessageInput.value));
    // TODO: Does not work on iphone!
    navigator.clipboard.writeText(url.toString());
    newMessageCopy.innerHTML = "✅";
    if (newMessageCopyTimeout) {
        clearTimeout(newMessageCopyTimeout)
    }
    newMessageCopyTimeout = setTimeout(() => {
        newMessageCopy.innerHTML = "📋";
    }, 4000);
});

// Load message
let message = "the quick brown fox jumped over the lazy dog";
try {
    const queryParams = new URLSearchParams(window.location.search);
    message = decode(queryParams.get("m")) ?? message;
} catch (e) { console.error(e); }

//// Input
const input = message;
const should_replay = true;

//// Timing
const FRAMES_PER_SECOND = 24;
const start_delay_s = 2;
const hold_frames = 48;

//// Movement
const should_reset_pose = true;
let can_crossbeam_flip = true;
const arm_friction = 0.9;

//// Size
const crossbeam_length = 20;
const crossbeam_width = 2.5;
const arm_length = 8;
const arm_width = 4;

//// Animation
// "linear", "easing", "physics"
const animation_mode = "physics";

// Linear
const crossbeam_speed = 512;
const arm_speed = 256;

// Easing
const easing_fn = "cubic-bezier(0.65, 0, 0.35, 1)";
const min_easing_angle = 30 * Math.PI / 180;
const default_easing = "ease-out";

// Physics
const crossbeam_torque = 40;
const arm_torque = 10;

// Config
const codes = {
    "a": [0, 0, 0],
    "b": [-45, 0, -90],
    "c": [-90, 0, 0],
    "d": [45, 180, 180],
    "e": [0, 180, 180],
    "f": [-45, 180, 180],
    "g": [90, 0, 0],
    "h": [45, 0, 0],
    "i": [0, 180, 0],
    "j": [0, 90, -90],
    "k": [-45, 180, -90],
    "l": [90, 180, 0],
    "m": [45, 90, 0],
    "n": [0, 0, 180],
    "o": [-45, 0, 180],
    "p": [90, 0, 180],
    "q": [45, 180, 0],
    "r": [0, 0, -90],
    "s": [-45, 0, -90],
    "t": [90, 90, 180],
    "u": [45, 90, 180],
    "v": [0, 90, 180],
    "w": [-45, 90, 180],
    "x": [90, 0, -90],
    "y": [45, 0, -90],
    "z": [0, 90, 0],
    "1": [90, 180, -90],
    "2": [45, 180, -90],
    "3": [0, 180, -90],
    "4": [-45, 180, -90],
    "5": [-90, 180, -90],
    "6": [45, 90, 0],
    "7": [45, 180, -90],
    "8": [0, 180, -90],
    "9": [-45, 180, -90],
    "0": [-90, 90, -90],
    " ": [0, -90, 90],
}

// Object Setup
const scene = new Scene();
let post, crossbeam, left_arm, right_arm;
function rebuild() {
    scene.cancel();
    scene.clear();
    const postWidth = 2;
    const postHeight = 12;
    post = new Beam(0, 0, postWidth, postHeight, null, null, "assets/post.png");
    crossbeam = new Beam(-0.45, 10, crossbeam_length, crossbeam_width, -0.2, "center", "assets/crossbeam.png");
    left_arm = new Beam(9, 10.2, arm_width, arm_length, "center", 11.2, "assets/left_arm.png");
    right_arm = new Beam(-9.8, 10, arm_width, arm_length, "center", 11, "assets/right_arm.png");
    crossbeam.addChild(left_arm);
    crossbeam.addChild(right_arm);
    post.addChild(crossbeam);
    scene.add(post);
    recalculate();
}

let crossbeam_mass, arm_mass, crossbeam_moment_of_inertia, arm_moment_of_inertia;
function recalculate() {
    const density_of_wood = 500; // 0.5 g/cm^3 --> kg/m^3

    const l_cross = crossbeam_length;
    const w_cross = crossbeam_width;
    crossbeam_mass = l_cross * w_cross *  w_cross * density_of_wood;

    const l_arm = arm_length;
    const w_arm = arm_width;
    arm_mass = l_arm * w_arm *  w_arm * density_of_wood;

    crossbeam_moment_of_inertia = (1 / 12) * crossbeam_mass * l_cross * l_cross;
    arm_moment_of_inertia = (1 / 12) * arm_mass * l_arm * l_arm;
}

rebuild();

// Begin Script
const pi = Math.PI;
const two_pi = 2 * pi;

function deg_to_rad(deg) {
    return deg * pi / 180
}

function rad_to_deg(rad) {
    return rad * 180 / pi
}


// Project angle B into +/- half_range of angle A and return their difference
function normalized_angle_diff(a, b, range) {
    const half_range = range / 2;
    const angle_diff = mod(b - a, range);
    return mod(angle_diff + half_range, range) - half_range
}


function get_rotation(obj) {
    return obj.rotation;
}


function set_rotation(obj, rad) {
    obj.rotation = rad;
}


function get_easing_fn(angle_diff) {
    if (animation_mode === "easing") {
        return Math.abs(angle_diff) > min_easing_angle ? easing_fn : default_easing;
    }
    return "linear";
}


function animate_rotation(obj, angle_end, frame_start, frame_end, insert_initial, easing) {
    if (insert_initial) {
        obj.keyframe_insert(frame_start, easing);
    }
    set_rotation(obj, angle_end);
    obj.keyframe_insert(frame_end);
}


function hold_for(obj, frame) {
    obj.keyframe_insert(frame);
}


function rotate_by(obj, radians, frame_start, frame_end, insert_initial, easing) {
    const angle_end = get_rotation(obj) + radians;
    animate_rotation(obj, angle_end, frame_start, frame_end, insert_initial, easing);
}


function rotate_to_easing(
    obj,
    degrees,
    frame_start,
    frames_per_rotation,
    allow_symmetry = false,
    on_animate = () => {}
) {
    const angle_start = get_rotation(obj);
    let angle_end = deg_to_rad(degrees);

    // Project angle_end into angle_start +/- 180, or 90 if there's symmetry
    const angle_range = allow_symmetry ? pi : two_pi;
    const angle_diff = normalized_angle_diff(angle_start, angle_end, angle_range);
    angle_end = angle_start + angle_diff;

    const frame_end = frame_start + Math.ceil(frames_per_rotation * Math.abs(angle_diff) / two_pi);
    const easing = get_easing_fn(angle_diff);

    animate_rotation(obj, angle_end, frame_start, frame_end, true, easing);
    on_animate(angle_diff, frame_end, easing)

    return frame_end;
}


function rotate_to_physics(
    obj,
    degrees,
    frame_start,
    mass,
    moment_of_inertia,
    torque,
    allow_symmetry = false,
    on_animate = () => {}
) {
    const angle_start = get_rotation(obj);
    let angle_end = deg_to_rad(degrees);

    // Project angle_end into angle_start +/- 180, or 90 if there's symmetry
    const angle_range = allow_symmetry ? pi : two_pi;
    const angle_diff = normalized_angle_diff(angle_start, angle_end, angle_range);
    angle_end = angle_start + angle_diff;

    if (angle_diff === 0) {
        return frame_start;
    }

    const coeff_friction = 0.1;
    const axle_radius = 0.1;
    const g = 9.8;
    const mechanical_advantage = 20000;
    const min_w = 0.05;
    const fps = 24;
    const dt = 1 / fps;
    const angle_direction = Math.sign(angle_diff);
    let frame = frame_start;
    let w = 0;
    let direction = angle_direction;
    let angle = angle_start;
    while (true) {
        // Apply turning force
        w += direction * torque * mechanical_advantage * dt / moment_of_inertia;

        // Apply friction
        const friction = axle_radius * coeff_friction * mass * g * dt / moment_of_inertia;
        w = Math.sign(w) * Math.max(Math.abs(w) - friction, 0);

        // Integrate rotation
        const angle_change = w * dt;
        angle += angle_change;

        // Animate
        animate_rotation(obj, angle, frame, frame + 1, false);
        on_animate(angle_change, frame + 1);

        // Step time
        frame++;

        const progress = Math.abs((angle - angle_start) / angle_diff);

        const reverse_point = 0.5;

        // If past halfway, slow it down
        if (progress > reverse_point && direction === angle_direction) {
            direction *= -1;
        }

        // If going the wrong way, correct
        if (progress > reverse_point && w * angle_diff < 0) {
            w = angle_direction * min_w;
            direction = 0;
        }

        if (progress > reverse_point && Math.abs(w) < min_w) {
            w = angle_direction * min_w;
            if (Math.abs((1 - progress) * angle_diff) > deg_to_rad(0.1)) {
                direction = angle_direction
            } else {
                direction = 0;
            }
        }

        //  - Long turn: stop torquing for a while (max_w?)
        if (progress > 0.9 && Math.abs(w) < 2 * min_w) {
            direction = 0;
        }

        // If arrived, end
        if (progress > 1) {
            break;
        }

        // Failsafe
        if (frame - frame_start > 1000) {
            break;
        }
    }
    return frame;
}


function rotate_crossbeam(code, frame_start) {
    // Set up freewheeling arms
    let freewheel_start = frame_start;
    function freewheel_arms(crossbeam_change, freewheel_end, easing) {
        if (arm_friction < 1) {
            const isPhysics = animation_mode === "physics";
            const arm_freewheel = crossbeam_change * (arm_friction - 1);
            rotate_by(left_arm, arm_freewheel, freewheel_start, freewheel_end, isPhysics, easing);
            rotate_by(right_arm, arm_freewheel, freewheel_start, freewheel_end, isPhysics, easing);
            freewheel_start = freewheel_end;
        }
    }

    let frame_end;
    if (animation_mode === "physics") {
        frame_end = rotate_to_physics(
            crossbeam,
            code[0],
            frame_start,
            crossbeam_mass,
            crossbeam_moment_of_inertia,
            crossbeam_torque,
            can_crossbeam_flip,
            freewheel_arms
        );
    } else {
        frame_end = rotate_to_easing(
            crossbeam,
            code[0],
            frame_start,
            crossbeam_speed,
            can_crossbeam_flip,
            freewheel_arms
        );
    }

    return frame_end;
}


function rotate_arms(code, frame_start) {
    // First check crossbeam configuration
    const crossbeam_expected = deg_to_rad(code[0])
    const crossbeam_actual = get_rotation(crossbeam)
    const crossbeam_diff = normalized_angle_diff(crossbeam_expected, crossbeam_actual, two_pi)
    const is_crossbeam_flipped = Math.abs(crossbeam_diff) > 0.1

    let first_arm = right_arm;
    let first_rotation = code[1];
    let second_arm = left_arm;
    let second_rotation = code[2];
    // If crossbeam is flipped, swap and reverse arms
    if (can_crossbeam_flip && is_crossbeam_flipped) {
        first_arm = left_arm;
        first_rotation += 180;
        second_arm = right_arm;
        second_rotation += 180;
    }

    // Then rotate arms
    let t = frame_start
    if (animation_mode === "physics") {
        t = rotate_to_physics(first_arm, first_rotation, t, arm_mass, arm_moment_of_inertia, arm_torque);
        t = rotate_to_physics(second_arm, second_rotation, t, arm_mass, arm_moment_of_inertia, arm_torque);
    } else {
        t = rotate_to_easing(first_arm, first_rotation, t, arm_speed);
        t = rotate_to_easing(second_arm, second_rotation, t, arm_speed);
    }

    return t;
}


function run() {
    // Set query param
    try {
        const url = new URL(window.location);
        url.searchParams.set("m", encode(input));
        history.pushState({}, "", url.toString());
    } catch (e) { console.error(e); }

    const messageDisplay = document.getElementById("message");
    const shouldDisplay = messageDisplay && !messageDisplay.innerHTML

    // Reset
    scene.cancel();
    scene.reset();
    recalculate();

    let t = start_delay_s * FRAMES_PER_SECOND;

    // Initial pose
    if (should_reset_pose) {
        set_rotation(crossbeam, 0)
        set_rotation(right_arm, -Math.PI / 2)
        set_rotation(left_arm, Math.PI / 2)
    }

    for (const letter of input) {
        const code = codes[letter.toLowerCase()];

        if (code) {
            // Rotate
            t = rotate_crossbeam(code, t);
            t = rotate_arms(code, t);

            // Hold
            t += hold_frames;
            hold_for(crossbeam, t);
            hold_for(right_arm, t);
            hold_for(left_arm, t);
        }

        if (shouldDisplay) {
            setTimeout(() => {
                messageDisplay.innerHTML += letter;
            }, t / FRAMES_PER_SECOND * 1000);
        }
    }

    // We also have to reset at the end
    if (should_reset_pose) {
        can_crossbeam_flip = false;
        t = rotate_crossbeam([0, -90, 90], t);
        t = rotate_arms([0, -90, 90], t);
        t += hold_frames;
        hold_for(crossbeam, t);
        hold_for(right_arm, t);
        hold_for(left_arm, t);
        can_crossbeam_flip = true;
        set_rotation(crossbeam, 0)
        set_rotation(right_arm, -Math.PI / 2)
        set_rotation(left_arm, Math.PI / 2)
    }

    if (should_replay) {
        setTimeout(() => run(), t / FRAMES_PER_SECOND * 1000);
    }

    scene.play(t);
}

run();
