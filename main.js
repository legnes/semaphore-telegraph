import { Beam, Scene } from "./scene-objects.js";
import { InputControl, InputSection, mod } from "./utils.js";

let message = "abcdefghijklmnopqrstuvwxyz";
try {
    const queryParams = new URLSearchParams(window.location.search);
    message = queryParams.get("m") ?? message;
} catch (e) { console.error(e); }

// Input
const input = new InputControl({ type: "text", value: message }, "Input");
// const input = new InputControl({ type: "text", value: "bc" }, "Input");

// Settings

//// Timing
new InputSection("Timing");
const hold_frames = new InputControl({ type: "number", value: 48 }, "Hold Time (frames)");

//// Movement
new InputSection("Movement");
const should_reset_pose = true;
const can_crossbeam_flip = new InputControl({ type: "checkbox", checked: true }, "Crossbeam Can Flip");
const arm_friction = new InputControl({ type: "range", min: 0, max: 1, step: 0.05, value: 0.9 }, "Arm Friction (0 - 1)");

//// Size
new InputSection("Size");
const crossbeam_length = new InputControl({ type: "number", value: 24, min: 4 }, "Crossbeam Length", rebuild);
const crossbeam_width = new InputControl({ type: "number", value: 4, min: 1 }, "Crossbeam Width", rebuild);
const arm_length = new InputControl({ type: "number", value: 10, min: 2 }, "Arm Length", rebuild);
const arm_width = new InputControl({ type: "number", value: 4, min: 1 }, "Arm Width", rebuild);

//// Animation
new InputSection("Animation");
const animation_mode = new InputControl(
    { type: "select", options: ["linear", "easing", "physics"], value: "physics" },
    "Animation Mode",
    updateAnimationInputs
);

function updateAnimationInputs() {
    const linear_settings = [ crossbeam_speed, arm_speed ];
    const easing_settings = [ ...linear_settings, easing_fn ];
    const physics_settings = [ crossbeam_torque, arm_torque ];

    // Disable all
    [ ...linear_settings, ...easing_settings, ...physics_settings].forEach(input => input.disable());

    // Enable relevant
    const mode = animation_mode.value;
    const settings = mode === "physics" ? physics_settings : mode === "easing" ? easing_settings : linear_settings;
    settings.forEach(input => input.enable());
}

// Linear
new InputSection("Keyframed animation (linear and easing)", { delimit: false });
const crossbeam_speed = new InputControl({ type: "number", value: 512 }, "Crossbeam Speed (frames per full rotation)");
const arm_speed = new InputControl({ type: "number", value: 256 }, "Arm Speed Speed (frames per full rotation)");

// Easing
const easing_fn = new InputControl({ type: "text", value: "cubic-bezier(0.65, 0, 0.35, 1)" }, "Easing function (css)");
const min_easing_angle = 30 * Math.PI / 180;
const default_easing = "ease-out";

// Physics
new InputSection("Physics animation", { delimit: false });
const crossbeam_torque = new InputControl({ type: "number", value: 40 }, "Crossbeam Torque");
const arm_torque = new InputControl({ type: "number", value: 10 }, "Arm Torque");
updateAnimationInputs();

// Rerun
new InputSection("");
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
let post, crossbeam, left_arm, right_arm;
function rebuild() {
    scene.cancel();
    scene.clear();
    const postWidth = 4;
    const postHeight = 32;
    post = new Beam(0, 0, postWidth, postHeight);
    crossbeam = new Beam(0, postHeight - crossbeam_width.value / 2, crossbeam_length.value, crossbeam_width.value, "center");
    const arm_offset = crossbeam_length.value / 2 - arm_width.value / 2;
    left_arm = new Beam(arm_offset, postHeight, arm_width.value, arm_length.value, "bottom");
    right_arm = new Beam(-arm_offset, postHeight, arm_width.value, arm_length.value, "bottom");
    crossbeam.addChild(left_arm);
    crossbeam.addChild(right_arm);
    post.addChild(crossbeam);
    scene.add(post);
    recalculate();
}

let crossbeam_mass, arm_mass, crossbeam_moment_of_inertia, arm_moment_of_inertia;
function recalculate() {
    const density_of_wood = 500; // 0.5 g/cm^3 --> kg/m^3

    const l_cross = crossbeam_length.value;
    const w_cross = crossbeam_width.value;
    crossbeam_mass = l_cross * w_cross *  w_cross * density_of_wood;

    const l_arm = arm_length.value;
    const w_arm = arm_width.value;
    arm_mass = l_arm * w_arm *  w_arm * density_of_wood;

    // TODO: Fix this calc...
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
    if (animation_mode.value === "easing") {
        return Math.abs(angle_diff) > min_easing_angle ? easing_fn.value : default_easing;
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
    // TODO: This is made up to make things feel right
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
        // TODO: Use real physics for this
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
        // console.log(frame, rad_to_deg(angle), direction, w, progress);

        const reverse_point = 0.5;

        // If past halfway, slow it down
        if (progress > reverse_point && direction === angle_direction) {
            // console.log("reverse!");
            direction *= -1;
        }

        // If going the wrong way, correct
        if (progress > reverse_point && w * angle_diff < 0) {
            // console.log("overshoot!")
            w = angle_direction * min_w;
            direction = 0;
        }

        if (progress > reverse_point && Math.abs(w) < min_w) {
            // console.log("too slow!")
            w = angle_direction * min_w;
            if (Math.abs((1 - progress) * angle_diff) > deg_to_rad(0.1)) {
                direction = angle_direction
            } else {
                direction = 0;
            }
        }

        // TODO: tweak these rules, add a little more character here...
        //  - Long turn: stop torquing for a while (max_w?)
        if (progress > 0.9 && Math.abs(w) < 2 * min_w) {
            direction = 0;
        }

        // If arrived, end
        if (progress > 1) {
            // console.log("end");
            break;
        }

        // Failsafe
        if (frame - frame_start > 1000) {
            // console.log("failsafe");
            break;
        }
    }

    // const frame_end = frame_start + Math.ceil(frames_per_rotation * Math.abs(angle_diff) / two_pi);

    // animate_rotation(obj, angle_end, frame_start, frame_end, false);

    return frame;
}


function rotate_crossbeam(code, frame_start) {
    // Set up freewheeling arms
    let freewheel_start = frame_start;
    function freewheel_arms(crossbeam_change, freewheel_end, easing) {
        // TODO: for physics, use real forces for this
        if (arm_friction.value < 1) {
            const isPhysics = animation_mode.value === "physics";
            const arm_freewheel = crossbeam_change * (arm_friction.value - 1);
            rotate_by(left_arm, arm_freewheel, freewheel_start, freewheel_end, isPhysics, easing);
            rotate_by(right_arm, arm_freewheel, freewheel_start, freewheel_end, isPhysics, easing);
            freewheel_start = freewheel_end;
        }
    }

    let frame_end;
    if (animation_mode.value === "physics") {
        frame_end = rotate_to_physics(
            crossbeam,
            code[0],
            frame_start,
            crossbeam_mass,
            crossbeam_moment_of_inertia,
            crossbeam_torque.value,
            can_crossbeam_flip.value,
            freewheel_arms
        );
    } else {
        frame_end = rotate_to_easing(
            crossbeam,
            code[0],
            frame_start,
            crossbeam_speed.value,
            can_crossbeam_flip.value,
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
    const is_crossbeam_flipped = Math.abs(crossbeam_diff) > 0.001

    let first_arm = right_arm;
    let first_rotation = code[1];
    let second_arm = left_arm;
    let second_rotation = code[2];
    // If crossbeam is flipped, swap and reverse arms
    if (can_crossbeam_flip.value && is_crossbeam_flipped) {
        first_arm = left_arm;
        first_rotation += 180;
        second_arm = right_arm;
        second_rotation += 180;
    }

    // Then rotate arms
    let t = frame_start
    if (animation_mode.value === "physics") {
        t = rotate_to_physics(first_arm, first_rotation, t, arm_mass, arm_moment_of_inertia, arm_torque.value);
        t = rotate_to_physics(second_arm, second_rotation, t, arm_mass, arm_moment_of_inertia, arm_torque.value);
    } else {
        t = rotate_to_easing(first_arm, first_rotation, t, arm_speed.value);
        t = rotate_to_easing(second_arm, second_rotation, t, arm_speed.value);
    }

    return t;
}


function run() {
    // Set query param
    try {
        const url = new URL(window.location);
        url.searchParams.set("m", input.value);
        history.pushState({}, "", url.toString());
    } catch (e) { console.error(e); }

    // Reset
    scene.cancel();
    scene.reset();
    recalculate();

    let t = 1

    // Initial pose (A)
    if (should_reset_pose) {
        set_rotation(crossbeam, 0)
        set_rotation(right_arm, 0)
        set_rotation(left_arm, 0)
    }

    for (const letter of input.value) {
        const code = codes[letter.toLowerCase()];

        // Rotate
        t = rotate_crossbeam(code, t);
        t = rotate_arms(code, t);

        // Hold
        t += hold_frames.value;
        hold_for(crossbeam, t);
        hold_for(right_arm, t);
        hold_for(left_arm, t);
    }

    // We also have to reset at the end
    // TODO: sort out whats going on -- why do we need this?
    if (should_reset_pose) {
        set_rotation(crossbeam, 0)
        set_rotation(right_arm, 0)
        set_rotation(left_arm, 0)
    }

    scene.play(t);
}

run();
