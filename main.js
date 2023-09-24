import { Beam, Scene } from "./scene-objects.js";
import { InputControl, mod } from "./utils.js";

// Input
const input = new InputControl({ type: "text", value: "abcdefghijklmnopqrstuvwxyz" }, "Input");

// Settings

//// Timing
const hold_frames = new InputControl({ type: "number", value: 48 }, "Hold Time (frames)");
const crossbeam_speed = new InputControl({ type: "number", value: 512 }, "Arm Speed Speed (frames per full rotation)");
const arm_speed = new InputControl({ type: "number", value: 256 }, "Arm Speed Speed (frames per full rotation)");

//// Movement
const should_reset_pose =  true;
const can_crossbeam_flip = new InputControl({ type: "checkbox", checked: true }, "Crossbeam Can Flip");

// Physics
const arm_friction = new InputControl({ type: "range", min: 0, max: 1, step: 0.05, value: 0.5 }, "Arm Friction (0 - 1)");
const easing_fn = new InputControl({ type: "text", value: "cubic-bezier(0.65, 0, 0.35, 1)" }, "Easing function (css)");
const min_easing_angle = 30 * Math.PI / 180;
const default_easing = "ease-out";

// Rerun
new InputControl({ type: "button", value: "Rerun" }, "", run);


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
    "j": [0, 0, 0],
    "k": [-45, 180, -90],
    "l": [90, 180, 0],
    "m": [45, 90, 0],
    "n": [0, 0, 180],
    "o": [-45, 0, 180],
    "p": [90, 0, 180],
    "q": [45, 0, 180],
    "r": [0, 0, -90],
    "s": [-45, 0, -90],
    "t": [90, 90, 180],
    "u": [45, 90, 180],
    "v": [0, 90, 180],
    "w": [-45, 90, 180],
    "x": [90, 0, -90],
    "y": [45, 0, -90],
    "z": [0, 90, 0],
    " ": [0, 0, 0],
}

// Object Setup
const scene = new Scene();
const post = new Beam(0, 0, 4, 32);
const crossbeam = new Beam(0, 30, 24, 4, "center");
const left_arm = new Beam(10, 32, 4, 10, "bottom");
const right_arm = new Beam(-10, 32, 4, 10, "bottom");
crossbeam.addChild(left_arm);
crossbeam.addChild(right_arm);
post.addChild(crossbeam);
scene.add(post);

// Begin Script
const pi = Math.PI;
const two_pi = 2 * pi;

function deg_to_rad(deg) {
    return deg * pi / 180
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
    return Math.abs(angle_diff) > min_easing_angle ? easing_fn.value : default_easing;
}


function animate_rotation(obj, angle_end, frame_start, frame_end, easing) {
    obj.keyframe_insert(frame_start, easing);
    set_rotation(obj, angle_end);
    obj.keyframe_insert(frame_end);
}


function hold_for(obj, frame) {
    obj.keyframe_insert(frame);
}


function rotate_by(obj, radians, frame_start, frame_end) {
    const angle_end = get_rotation(obj) + radians;
    animate_rotation(obj, angle_end, frame_start, frame_end, get_easing_fn(radians));
}


function rotate_to(
    obj,
    degrees,
    frame_start,
    frames_per_rotation = arm_speed.value,
    allow_symmetry = false,
) {
    const angle_start = get_rotation(obj);
    let angle_end = deg_to_rad(degrees);

    // Project angle_end into angle_start +/- 180, or 90 if there's symmetry
    const angle_range = allow_symmetry ? pi : two_pi;
    const angle_diff = normalized_angle_diff(angle_start, angle_end, angle_range);
    angle_end = angle_start + angle_diff;

    const frame_end = frame_start + Math.ceil(frames_per_rotation * Math.abs(angle_diff) / two_pi);

    animate_rotation(obj, angle_end, frame_start, frame_end, get_easing_fn(angle_diff));

    return [frame_end, angle_diff];
}


function run() {
    // Reset
    scene.cancel();
    scene.reset();

    let t = 1

    // Initial pose (A)
    if (should_reset_pose) {
        set_rotation(crossbeam, 0)
        set_rotation(right_arm, 0)
        set_rotation(left_arm, 0)
    }

    for (const letter of input.value) {
        const code = codes[letter.toLowerCase()];

        const t_start = t;

        let crossbeam_change;

        // Rotate crossbeam
        [t, crossbeam_change] = rotate_to(
            crossbeam,
            code[0],
            t,
            crossbeam_speed.value,
            can_crossbeam_flip.value
        )

        // Freewheel arms
        if (arm_friction.value < 1) {
            const arm_freewheel = crossbeam_change * (arm_friction.value - 1)
            rotate_by(left_arm, arm_freewheel, t_start, t)
            rotate_by(right_arm, arm_freewheel, t_start, t)
        }

        // Check Crossbeam ronfiguration
        const crossbeam_expected = deg_to_rad(code[0])
        const crossbeam_actual = get_rotation(crossbeam)
        const crossbeam_diff = normalized_angle_diff(crossbeam_expected, crossbeam_actual, two_pi)
        const is_crossbeam_flipped = Math.abs(crossbeam_diff) > 0.001

        // Rotate arms
        if (can_crossbeam_flip.value && is_crossbeam_flipped) {
            // Swap and reverse arms
            t = rotate_to(left_arm, code[1] + 180, t)[0];
            t = rotate_to(right_arm, code[2] + 180, t)[0];
        } else {
            t = rotate_to(right_arm, code[1], t)[0];
            t = rotate_to(left_arm, code[2], t)[0];
        }

        t += hold_frames.value;
        hold_for(crossbeam, t);
        hold_for(right_arm, t);
        hold_for(left_arm, t);
    }

    scene.play(t);
}

run();
