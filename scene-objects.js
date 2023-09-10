import { createSVGNode } from "./utils.js";

const FRAMES_PER_SECOND = 24;

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

export class Scene extends SceneObject {
    #node = createSVGNode("svg", { style: "width: 720px; height: 720px;" });

    constructor() {
        super();
        document.body.appendChild(this.#node);
    }

    add(obj) {
        super.addChild(obj);
        this.#node.appendChild(obj.node);
        const { x, y, width, height } = this.#node.getBBox();
        this.#node.setAttribute("viewBox", `${x - 10} ${y -  20} ${width + 20} ${height + 20}`);
    }
}

export class Beam extends SceneObject {
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

    constructor(x, y, width, height, pivotPoint) {
        super();

        const canRotate = !!pivotPoint
        const pivotX = canRotate ? x : 0;
        const pivotY = pivotPoint === "bottom" ? y :
            pivotPoint === "center" ? y + height / 2 : 0;

        this.node = createSVGNode("g", {
            "transform-origin": `${pivotX} ${-pivotY}`,
        });
        this.node.appendChild(createSVGNode("rect", {
            x: x - width / 2,
            y: -(y + height),
            width,
            height,
            fill: "brown",
            stroke: "black",
            "stroke-width": 0.5,
        }));
    }

    addChild(obj) {
        super.addChild(obj);
        this.node.appendChild(obj.node);
    }

    keyframe_insert(frame) {
        this.#keyframes.push({ rotation: this.#rotation, frame });
    }

    play(endFrame) {
        super.play(endFrame);

        if (this.#keyframes.length < 1) {
            return;
        }

        const transform = this.#keyframes.map(({ rotation }) => `rotate(${-rotation}rad)`);
        const offset = this.#keyframes.map(({ frame }) => (frame - 1) / (endFrame - 1));
        this.#animation = this.node.animate({ transform, offset }, 1000 * endFrame / FRAMES_PER_SECOND);
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